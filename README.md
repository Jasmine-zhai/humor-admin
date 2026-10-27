# Memeside Heights · Control Room

Admin area for [Memeside Heights](https://github.com/Jasmine-zhai/helloworld). Same Supabase database, separate Next.js app.

## What it does

- **Overview**: stats from the database. Which of the 3 AI captions people pick, how many memes get abandoned as drafts, busiest chats, what hour people post, caption length, Gemini model usage, and the most liked memes.
- **Users**: read every profile, with email, join date, last sign-in and activity.
- **AI captions**: create (write by hand or generate 3 more with Gemini), read, update (edit text, change which caption shows in the feed) and delete captions, or delete a whole meme.
- **Likes & votes**: read every like, plus the old Week 4 up and down votes.

## Who can get in

Every route is behind Google login, and only accounts with `profiles.is_superadmin = true` get past `/not-allowed`.
The check runs three times: in the `(admin)` layout, in every server action, and inside every database function
(`admin_*`, all `security definer` and starting with `assert_superadmin()`). So even someone calling Supabase directly
with the public anon key gets "Admins only".

Users can't make themselves admin. `profiles` only allows updating `first_name`, `last_name`, `avatar_url` and `updated_at`.

## Won't you be locked out?

The app can't turn `is_superadmin` on, so the first admin is set by hand in the Supabase SQL editor, which uses
the project owner's access and skips row level security:

```sql
update public.profiles set is_superadmin = true
where id = (select id from auth.users where email = 'you@example.com');
```

The full database setup is in `supabase/week6.sql`.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
