# Samarkand ICJ — Vercel + Supabase deployment

## 1. Create the Supabase database

Create a Supabase project, then open **SQL Editor** and run:

`supabase/migrations/001_create_registrations.sql`

Do not create public INSERT/SELECT policies. The application writes through the server-side Vercel API using the Supabase service-role key.

## 2. Add Vercel environment variables

In the Vercel project settings, add these variables for **Production, Preview, and Development** as appropriate:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role key

Never expose the service-role key in frontend code and never prefix it with `VITE_`.

## 3. Deploy

Import the repository into Vercel. Vercel should detect Vite automatically.

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

The `/api/register` file is deployed as a Vercel serverless function.

## 4. Test the production application

1. Open the deployed ICJ page.
2. Submit one test application.
3. Confirm the success screen appears.
4. Open Supabase → Table Editor → `registrations`.
5. Confirm the test row exists.
6. Delete the test row before opening applications publicly.

## Security model

- Supabase service-role credentials exist only in Vercel server environment variables.
- The browser never receives the service-role key.
- Supabase Row Level Security is enabled.
- There is no public `/api/registrations` endpoint.
- The API rejects cross-origin browser submissions when an Origin header is present.
- A hidden honeypot field filters basic automated spam.
- Input lengths and required values are validated server-side.

The old Flask + SQLite backend is intentionally no longer part of the deployment architecture.
