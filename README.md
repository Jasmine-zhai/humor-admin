# Memeside Heights · Control Room

Admin area for [Memeside Heights](https://github.com/Jasmine-zhai/helloworld). Same Supabase database, separate Next.js app.

## Sections

| Section | Table | Can do |
|---|---|---|
| Overview | several | Stats on memes, captions, chats, plus caption pipeline health (success rate, wait time, which model wins) |
| Users | `profiles` | read |
| AI captions | `captions` | read, plus create, edit, pick and delete captions |
| Likes & votes | `likes`, `votes` | read |
| Prompt chains | `prompt_chains` | read |
| Prompt chain steps | `prompt_chain_steps` | read |
| Prompt chain mix | `prompt_chain_mix` | read, update |
| Generation requests | `generation_requests` | read |
| LLM responses | `llm_responses` | read |
| Terms | `terms` | create, read, update, delete |
| Generation examples | `generation_examples` | create, read, update, delete |
| LLM models | `llm_models` | create, read, update, delete |
| LLM providers | `llm_providers` | create, read, update, delete |
| Images | `posts` + storage bucket `posts` | create (upload), read, update, delete |
| Allowed signup domains | `allowed_signup_domains` | create, read, update, delete |
| Whitelisted emails | `whitelisted_emails` | create, read, update, delete |

These aren't just tables: the caption app uses them. When someone cooks up captions, it reads the active prompt
chain, the caption count from the mix, the active models, and the top terms and examples, then logs the request
and every model call. Login checks the allowed domains and whitelist (if both are empty, everyone can sign in).

The Week 7 sections are driven by `lib/resources.ts` and one shared page and set of server actions in
`app/(admin)/[resource]`. Server actions only write columns marked `editable` there.

## Who can get in

Every route is behind Google login, and only accounts with `profiles.is_superadmin = true` get past `/not-allowed`.
The check runs in the `(admin)` layout and in every server action, and row level security on every table checks
`is_superadmin()` too, so calling Supabase directly with the public key doesn't get around it.

## Won't you be locked out?

The app can't turn `is_superadmin` on, so the first admin is set by hand in the Supabase SQL editor, which uses
the project owner's access and skips row level security. See `supabase/make-first-admin.sql`.

## Database setup

Run `supabase/week6.sql`, then `supabase/week7.sql`, in the Supabase SQL editor.
