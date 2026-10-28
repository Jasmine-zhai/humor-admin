-- ===== Week 7: caption pipeline settings + generation logs for Memeside Heights =====
-- Run in the Memeside Heights Supabase project ("week 2"), after week6.sql.
-- The caption app reads its prompt, models, terms and examples from these tables,
-- and writes a log row for every generation. The admin app manages all of it.

-- ---------- AI setup ----------
create table public.llm_providers (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.llm_models (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 80),
  provider_model_id text not null unique check (char_length(trim(provider_model_id)) between 1 and 120),
  llm_provider_id bigint not null references public.llm_providers(id),
  is_active boolean not null default true,
  priority integer not null default 0, -- lower runs first when models race
  created_at timestamptz not null default now()
);

create table public.prompt_chains (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(trim(name)) between 1 and 80),
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.prompt_chain_steps (
  id bigint generated always as identity primary key,
  prompt_chain_id bigint not null references public.prompt_chains(id) on delete cascade,
  step_order integer not null default 1,
  description text,
  system_prompt text,
  user_prompt text not null, -- placeholders: {topic} {idea} {terms} {examples}
  temperature numeric not null default 1.1 check (temperature between 0 and 2),
  created_at timestamptz not null default now(),
  unique (prompt_chain_id, step_order)
);

-- how many captions each prompt chain writes per meme
create table public.prompt_chain_mix (
  id bigint generated always as identity primary key,
  prompt_chain_id bigint not null unique references public.prompt_chains(id) on delete cascade,
  caption_count integer not null default 3 check (caption_count between 1 and 6),
  updated_at timestamptz not null default now()
);

create table public.terms (
  id bigint generated always as identity primary key,
  term text not null check (char_length(trim(term)) between 1 and 80),
  definition text not null,
  example text not null,
  priority integer not null default 0, -- higher terms are included first
  created_at timestamptz not null default now()
);

create table public.generation_examples (
  id bigint generated always as identity primary key,
  image_description text not null,
  caption text not null,
  explanation text not null,
  priority integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Generation logs ----------
create table public.generation_requests (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  topic_id bigint references public.topics(id) on delete set null,
  idea text,
  prompt_chain_id bigint references public.prompt_chains(id) on delete set null,
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  model text,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create table public.llm_responses (
  id bigint generated always as identity primary key,
  generation_request_id bigint not null references public.generation_requests(id) on delete cascade,
  model text not null,
  status_code integer,
  duration_ms integer,
  prompt text,
  response text,
  created_at timestamptz not null default now()
);

-- ---------- Signup rules ----------
create table public.allowed_signup_domains (
  id bigint generated always as identity primary key,
  apex_domain text not null unique check (apex_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_at timestamptz not null default now()
);

create table public.whitelisted_emails (
  id bigint generated always as identity primary key,
  email text not null unique check (position('@' in email) > 1),
  created_at timestamptz not null default now()
);

-- Can this email sign in? With no domains and no whitelist set up, everyone can.
create or replace function public.is_email_allowed(p_email text)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select
    (not exists (select 1 from public.allowed_signup_domains) and not exists (select 1 from public.whitelisted_emails))
    or exists (select 1 from public.whitelisted_emails w where lower(w.email) = lower(p_email))
    or exists (
      select 1 from public.allowed_signup_domains d
      where lower(split_part(p_email, '@', 2)) = d.apex_domain
         or lower(split_part(p_email, '@', 2)) like '%.' || d.apex_domain
    );
$$;
grant execute on function public.is_email_allowed(text) to authenticated;

-- ---------- Row level security ----------
-- Admins (profiles.is_superadmin, see week6.sql) can do everything on every new table.
do $$
declare t text;
begin
  foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms',
                           'generation_examples','generation_requests','llm_responses','allowed_signup_domains','whitelisted_emails'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Admins manage %s" on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t, t);
  end loop;
end $$;

-- The caption generator runs as the logged-in user, so it can read the settings...
do $$
declare t text;
begin
  foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','generation_examples'] loop
    execute format('create policy "Logged in users read %s" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- ...and write its own log rows, but not read anyone's logs
create policy "Users log their own generations" on public.generation_requests
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users log responses for their own generations" on public.llm_responses
  for insert to authenticated
  with check (exists (select 1 from public.generation_requests g where g.id = generation_request_id and g.user_id = (select auth.uid())));

-- ---------- Images (meme uploads) ----------
-- Admins can see and manage every post's image. Everyone else keeps the Week 5 rules.
create policy "Admins read all posts" on public.posts for select to authenticated using (public.is_superadmin());
create policy "Admins add posts" on public.posts for insert to authenticated with check (public.is_superadmin());
create policy "Admins update posts" on public.posts for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());
create policy "Admins remove posts" on public.posts for delete to authenticated using (public.is_superadmin());
grant delete on public.posts to authenticated;
grant update (image_url, topic_id, idea) on public.posts to authenticated;

-- Only admins may change an image, topic or idea after posting (owners can still publish their drafts)
create or replace function public.guard_post_edits()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (new.image_url is distinct from old.image_url or new.topic_id is distinct from old.topic_id or new.idea is distinct from old.idea)
     and not public.is_superadmin() then
    raise exception 'Only admins can change a post''s image, chat or idea';
  end if;
  return new;
end;
$$;
create trigger guard_post_edits before update on public.posts for each row execute function public.guard_post_edits();

-- Admins can read every caption, like and comment too (for the AI captions and images pages)
create policy "Admins read all captions" on public.captions for select to authenticated using (public.is_superadmin());

-- ---------- Starting data: what the app already uses ----------
insert into public.llm_providers (name) values ('Google');

insert into public.llm_models (name, provider_model_id, llm_provider_id, priority)
select m.name, m.pid, p.id, m.priority
from public.llm_providers p,
  (values ('Gemini Flash Lite (latest)', 'gemini-flash-lite-latest', 1),
          ('Gemini Flash (latest)', 'gemini-flash-latest', 2),
          ('Gemini 2.5 Flash', 'gemini-2.5-flash', 3)) as m(name, pid, priority)
where p.name = 'Google';

insert into public.prompt_chains (name, description, is_active)
values ('Columbia captions', 'One step: look at the meme and write captions tied to Columbia student life.', true);

insert into public.prompt_chain_steps (prompt_chain_id, step_order, description, system_prompt, user_prompt, temperature)
select id, 1, 'Write the captions',
  'You write captions for "Memeside Heights", a site where Columbia University students post memes into topic channels and like the funniest ones. Be playful, not mean. No slurs, nothing sexual, and never target real named people.',
  'This meme is being posted in the "{topic}" channel.
{idea}
Look closely at the image and write {count} different funny captions for it. React to what is actually in the image and tie it to Columbia student life when it fits.
Campus terms you can use:
{terms}
Examples of the style we like:
{examples}
Make the captions feel different from each other so the poster has a real choice. Keep each under 25 words.
Return only a JSON array of {count} strings.',
  1.1
from public.prompt_chains where name = 'Columbia captions';

insert into public.prompt_chain_mix (prompt_chain_id, caption_count)
select id, 3 from public.prompt_chains where name = 'Columbia captions';

insert into public.terms (term, definition, example, priority) values
  ('Butler', 'Butler Library, the main library on campus and where people camp out during finals.', 'Third night in Butler, the 6th floor knows my name.', 10),
  ('John Jay', 'A dining hall on campus, known for long lines and a lot of comfort food.', 'John Jay at 7pm is a social event with chicken tenders.', 8),
  ('Ferris', 'Ferris Booth Commons, a dining hall in Lerner Hall.', 'The Ferris omelette line is my cardio.', 8),
  ('Lerner', 'Lerner Hall, the student center where clubs table and merch gets handed out.', 'Free tote at Lerner, my whole day is made.', 7),
  ('The Core', 'Columbia''s required Core Curriculum classes that every student takes.', 'The Core assigned 400 pages and called it "light reading".', 9),
  ('Lit Hum', 'Literature Humanities, the first-year Core seminar on the classics.', 'Lit Hum discussion when nobody did the Iliad reading.', 6),
  ('Low Steps', 'The steps in front of Low Library where everyone sits when it''s nice out.', 'Low Steps the first warm day is basically a festival.', 6),
  ('the 1 train', 'The subway line that runs along Broadway past campus.', 'The 1 train being late again is a Columbia tradition.', 5);

insert into public.generation_examples (image_description, caption, explanation, priority) values
  ('A person staring blankly at a laptop at 3am', 'Me in Butler realizing the essay is due in 5 hours and I have a title.', 'Specific Columbia place plus a relatable deadline panic.', 10),
  ('A huge crowd pushing toward a table', 'Lerner when someone says "free merch".', 'Short, ties the image to a real campus moment.', 8),
  ('A cat sitting in a box looking smug', 'Got a single in the housing lottery and now I''m unbearable.', 'Turns the expression into a campus status joke.', 6);

-- Backfill the generation log from existing posts so the admin pages show real history
insert into public.generation_requests (post_id, user_id, topic_id, idea, prompt_chain_id, status, model, created_at)
select p.id, p.user_id, p.topic_id, p.idea, null,
  case when exists (select 1 from public.captions c where c.post_id = p.id) then 'succeeded' else 'failed' end,
  (select c.model from public.captions c where c.post_id = p.id and c.model is not null limit 1),
  p.created_at
from public.posts p;

insert into public.llm_responses (generation_request_id, model, status_code, prompt, response, created_at)
select g.id, g.model, 200,
  (select c.prompt from public.captions c where c.post_id = g.post_id limit 1),
  (select json_agg(c.content order by c.id)::text from public.captions c where c.post_id = g.post_id),
  g.created_at
from public.generation_requests g
where g.model is not null;
