This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

### Environment variables

Copy `.env.example` to `.env.local` and populate the values for Airtable, Neon (Postgres), and other integrations. Key variables:

- `DATA_STORE`: `airtable` (default) or `postgres`
- `DATABASE_URL`: Neon connection string for Postgres
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_ENDPOINT_URL`
- `SESSION_SECRET`, `SMTP_*`, `MAIL_FROM_ADDRESS`, `GOOGLE_*`, `GEMINI_API_KEY`

### Database migrations & sync

Apply migrations to Neon/Postgres:

```bash
pnpm db:migrate
```

One-time (idempotent) Airtable → Postgres sync:

```bash
pnpm db:sync:from-airtable
```

### Development tips

- Set `DATA_STORE=airtable` to keep current behavior, or `postgres` to use Neon via the datastore abstraction.
- API routes resolve the datastore server-side only; no secrets are exposed to the client.
