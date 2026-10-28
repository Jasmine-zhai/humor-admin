# Memeside Heights · Control Room

Admin area for the shared Humor Project database (the course's teaching copy, restored into the
`humor-semester-project` Supabase project).

## Sections

| Section | Table | Can do |
|---|---|---|
| Overview | several | Stats: totals, slowest LLM models, busiest prompt chains, most liked captions |
| Users | `profiles` | read |
| Allowed signup domains | `allowed_signup_domains` | create, read, update, delete |
| Whitelisted emails | `whitelist_email_addresses` | create, read, update, delete |
| Prompt chains | `humor_flavors` | read |
| Prompt chain steps | `humor_flavor_steps` | read |
| Prompt chain mix | `humor_flavor_mix` | read, update |
| Prompt chain runs | `llm_prompt_chains` | read |
| AI captions | `captions` | read |
| Images | `images` + storage bucket `images` | create (upload or URL), read, update, delete |
| Generation requests | `caption_requests` | read |
| LLM responses | `llm_model_responses` | read |
| Generation examples | `caption_examples` | create, read, update, delete |
| Terms | `terms` | create, read, update, delete |
| LLM models | `llm_models` | create, read, update, delete |
| LLM providers | `llm_providers` | create, read, update, delete |

Every section is driven by one config file, `lib/resources.ts`, and one shared page and set of server actions in
`app/(admin)/[resource]`. Server actions only write columns marked `editable` in that config.

## Who can get in

Every route is behind Google login, and only accounts whose `profiles.is_superadmin` is `true` get past
`/not-allowed`. The check runs in the `(admin)` layout and again in every server action.

## Won't you be locked out?

The app can't turn `is_superadmin` on, so the first admin is set by hand in the Supabase SQL editor, which uses the
project owner's access and skips row level security:

```sql
update public.profiles set is_superadmin = true
where email = 'you@example.com';
```
