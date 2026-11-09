# Sanjeev — Five Year Countdown

A personal five-year countdown with a private notes area.

## Stack

- React 18 + TypeScript
- Vite 5
- Supabase Auth (email magic links)
- Supabase Postgres with Row Level Security
- Vercel

## Local development

1. Install dependencies.
2. Create `.env.local` with `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`). The supported `NEXT_PUBLIC_*` variants also work.
3. Run `npm run dev`.

Never expose a Supabase service-role or secret key through a `VITE_*` or `NEXT_PUBLIC_*` variable. The browser app must use only the publishable/anon key.

## Notes database

Apply the SQL migration in `supabase/migrations` to the Supabase project. It creates `public.user_notes` and restricts each authenticated user to their own row with Row Level Security.

In Supabase Authentication settings, allow the production site URL and any preview URLs that should be able to complete email magic-link sign-in.

## Quality checks

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Deployment

The `main` branch is connected to Vercel for production deployments. Preview deployments need their own Supabase URL and publishable key environment variables if private notes are to be tested there.
