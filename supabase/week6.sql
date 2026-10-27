-- ===== Week 6: admin area =====
-- Admin access is a column on profiles. Nobody can set it from the app: it can only be turned on
-- here in the Supabase SQL editor (that's how the first admin avoids being locked out).

alter table public.profiles add column if not exists is_superadmin boolean not null default false;

-- users can edit their name and photo, but never is_superadmin
-- (before this, logged-in users had table-wide UPDATE, which would have covered the new column too)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (first_name, last_name, avatar_url, updated_at) on public.profiles to authenticated;

-- is the logged-in user an admin? (security definer so it works whatever the profiles policies are)
create or replace function public.is_superadmin()
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select coalesce((select p.is_superadmin from public.profiles p where p.id = (select auth.uid())), false);
$$;
revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- Every admin function below starts with this check, so the data stays locked
-- even if someone calls the database directly with the public anon key.
create or replace function public.assert_superadmin()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_superadmin() from public, anon, authenticated;

-- ---------- READ: dashboard statistics ----------
create or replace function public.admin_stats()
returns json
language plpgsql
security definer set search_path = ''
stable
as $$
declare result json;
begin
  perform public.assert_superadmin();
  select json_build_object(
    'totals', json_build_object(
      'users', (select count(*) from public.profiles),
      'posts', (select count(*) from public.posts where published),
      'drafts', (select count(*) from public.posts where not published),
      'captions', (select count(*) from public.captions),
      'likes', (select count(*) from public.likes),
      'comments', (select count(*) from public.comments),
      'topics', (select count(*) from public.topics),
      'old_votes', (select count(*) from public.votes)
    ),
    -- which of the 3 AI options people actually pick (1st, 2nd or 3rd)
    'pick_position', (
      select coalesce(json_agg(json_build_object('position', pos, 'count', n) order by pos), '[]')
      from (
        select pos, count(*) n from (
          select chosen, row_number() over (partition by post_id order by id) pos from public.captions
        ) c where chosen group by pos
      ) t
    ),
    'topics', (
      select coalesce(json_agg(json_build_object('name', t.name, 'posts', t.posts, 'likes', t.likes, 'members', t.members) order by t.posts desc, t.likes desc), '[]')
      from (
        select tp.name,
          (select count(*) from public.posts p where p.topic_id = tp.id and p.published) posts,
          (select count(*) from public.likes l join public.posts p on p.id = l.post_id where p.topic_id = tp.id) likes,
          (select count(*) from public.topic_members m where m.topic_id = tp.id) members
        from public.topics tp
      ) t
    ),
    'models', (
      select coalesce(json_agg(json_build_object('model', model, 'count', n) order by n desc), '[]')
      from (select coalesce(model, 'unknown') model, count(*) n from public.captions group by 1) t
    ),
    -- when people post, New York time
    'hours', (
      select json_agg(json_build_object('hour', h, 'count', (
        select count(*) from public.posts p
        where extract(hour from p.created_at at time zone 'America/New_York') = h
      )) order by h)
      from generate_series(0, 23) h
    ),
    'caption_length', json_build_object(
      'chosen', (select round(avg(char_length(content))) from public.captions where chosen),
      'not_chosen', (select round(avg(char_length(content))) from public.captions where not chosen)
    ),
    'with_idea', json_build_object(
      'with', (select count(*) from public.posts where published and idea is not null),
      'without', (select count(*) from public.posts where published and idea is null)
    ),
    'top_posts', (
      select coalesce(json_agg(t order by t.likes desc, t.comments desc), '[]')
      from (
        select p.id, p.image_url, tp.name topic,
          (select c.content from public.captions c where c.post_id = p.id and c.chosen limit 1) caption,
          (select count(*) from public.likes l where l.post_id = p.id) likes,
          (select count(*) from public.comments cm where cm.post_id = p.id) comments
        from public.posts p join public.topics tp on tp.id = p.topic_id
        where p.published
        order by likes desc, comments desc, p.created_at desc
        limit 3
      ) t
    )
  ) into result;
  return result;
end;
$$;

-- ---------- READ: users / profiles ----------
create or replace function public.admin_users()
returns table (
  id uuid, email text, first_name text, last_name text, avatar_url text, is_superadmin boolean,
  joined_at timestamptz, last_sign_in_at timestamptz,
  posts bigint, likes_given bigint, comments bigint, chats bigint
)
language plpgsql
security definer set search_path = ''
stable
as $$
begin
  perform public.assert_superadmin();
  return query
  select p.id, u.email::text, p.first_name, p.last_name, p.avatar_url, p.is_superadmin,
    u.created_at, u.last_sign_in_at,
    (select count(*) from public.posts x where x.user_id = p.id and x.published),
    (select count(*) from public.likes x where x.user_id = p.id),
    (select count(*) from public.comments x where x.user_id = p.id),
    (select count(*) from public.topic_members x where x.user_id = p.id)
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by u.created_at desc nulls last;
end;
$$;

-- ---------- READ: AI generated media (memes and their captions) ----------
create or replace function public.admin_media()
returns json
language plpgsql
security definer set search_path = ''
stable
as $$
declare result json;
begin
  perform public.assert_superadmin();
  select coalesce(json_agg(t order by t.created_at desc), '[]') into result
  from (
    select p.id, p.image_url, p.published, p.idea, p.created_at, tp.name topic,
      coalesce(nullif(trim(concat(pr.first_name, ' ', pr.last_name)), ''), 'Unknown') author,
      (select count(*) from public.likes l where l.post_id = p.id) likes,
      (select coalesce(json_agg(json_build_object('id', c.id, 'content', c.content, 'chosen', c.chosen, 'model', c.model, 'created_at', c.created_at) order by c.id), '[]')
        from public.captions c where c.post_id = p.id) captions
    from public.posts p
    left join public.topics tp on tp.id = p.topic_id
    left join public.profiles pr on pr.id = p.user_id
  ) t;
  return result;
end;
$$;

-- ---------- CREATE / UPDATE / DELETE: captions ----------
create or replace function public.admin_create_caption(p_post_id bigint, p_content text, p_model text default 'admin (written by hand)', p_prompt text default null)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare new_id bigint;
begin
  perform public.assert_superadmin();
  if char_length(trim(p_content)) = 0 then raise exception 'Caption is empty'; end if;
  insert into public.captions (post_id, user_id, content, model, prompt)
  values (p_post_id, (select auth.uid()), left(trim(p_content), 280), p_model, p_prompt)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_update_caption(p_id bigint, p_content text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_superadmin();
  if char_length(trim(p_content)) = 0 then raise exception 'Caption is empty'; end if;
  update public.captions set content = left(trim(p_content), 280) where id = p_id;
end;
$$;

-- make this the caption shown in the feed (only one per meme)
create or replace function public.admin_choose_caption(p_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare pid bigint;
begin
  perform public.assert_superadmin();
  select post_id into pid from public.captions where id = p_id;
  update public.captions set chosen = (id = p_id) where post_id = pid;
end;
$$;

create or replace function public.admin_delete_caption(p_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_superadmin();
  delete from public.captions where id = p_id;
end;
$$;

-- delete a whole meme (its captions, likes and comments go with it)
create or replace function public.admin_delete_post(p_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.assert_superadmin();
  delete from public.posts where id = p_id;
end;
$$;

-- ---------- READ: likes (current) and old up/down votes ----------
create or replace function public.admin_likes()
returns json
language plpgsql
security definer set search_path = ''
stable
as $$
declare result json;
begin
  perform public.assert_superadmin();
  select json_build_object(
    'likes', (
      select coalesce(json_agg(t order by t.created_at desc), '[]') from (
        select l.created_at, l.post_id, p.image_url, tp.name topic,
          coalesce(nullif(trim(concat(pr.first_name, ' ', pr.last_name)), ''), 'Unknown') voter, u.email::text voter_email,
          (select c.content from public.captions c where c.post_id = p.id and c.chosen limit 1) caption
        from public.likes l
        join public.posts p on p.id = l.post_id
        left join public.topics tp on tp.id = p.topic_id
        left join public.profiles pr on pr.id = l.user_id
        left join auth.users u on u.id = l.user_id
      ) t
    ),
    'old_votes', (
      select coalesce(json_agg(t order by t.created_at desc), '[]') from (
        select v.created_at, v.value vote_value, c.content caption,
          coalesce(nullif(trim(concat(pr.first_name, ' ', pr.last_name)), ''), 'Unknown') voter, u.email::text voter_email
        from public.votes v
        left join public.captions c on c.id = v.caption_id
        left join public.profiles pr on pr.id = v.user_id
        left join auth.users u on u.id = v.user_id
      ) t
    )
  ) into result;
  return result;
end;
$$;

-- only logged-in users can even try to call these; each one checks is_superadmin itself
do $$
declare f text;
begin
  foreach f in array array[
    'admin_stats()', 'admin_users()', 'admin_media()', 'admin_likes()',
    'admin_create_caption(bigint, text, text, text)', 'admin_update_caption(bigint, text)',
    'admin_choose_caption(bigint)', 'admin_delete_caption(bigint)', 'admin_delete_post(bigint)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ===== Make yourself the first admin =====
-- update public.profiles set is_superadmin = true
-- where id = (select id from auth.users where email = 'YOUR_EMAIL@gmail.com');
