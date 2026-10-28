-- Run this once in the Supabase SQL editor to make your account an admin.
-- The app itself can never set is_superadmin, so this is how the first admin avoids being locked out.
update public.profiles set is_superadmin = true
where id in (select id from auth.users where email = 'you@example.com');
