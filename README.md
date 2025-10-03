# lChaty Landing

This repository contains a small static landing page for lChaty with a mailing-list signup form.

Currently the form uses FormSubmit.co as a placeholder. Replace the form `action` or implement a server-side endpoint to capture signups.

Files:
- `index.html` — landing page
- `styles.css` — simple styling
- `thank-you.html` — thank you page after signup
- `workers/form_worker.js` — example Cloudflare Worker to accept form submissions and store into a KV namespace named SIGNUPS

To publish: enable GitHub Pages in the repository settings (deploy from `main` branch) or host on any static site host (Netlify, Vercel, Pages).

Deploying to Cloudflare

This site can be hosted on Cloudflare Pages. To handle the signup form with a Worker and KV storage, follow these steps:

1. Create a Cloudflare Pages project for this repo or use an existing Pages site.
2. Create a Workers script using the code in `workers/form_worker.js`.
3. Create a KV namespace (for example `SIGNUPS`) in the Cloudflare dashboard and bind it to the Worker as `SIGNUPS`.
4. Deploy the Worker and configure a route for `/api/subscribe` that points to the Worker. The landing form posts to `/api/subscribe` which will be handled by the Worker and redirect to `/thank-you.html` on success.

For local development and CI, the `wrangler` CLI is recommended. Use a scoped deploy token for Workers; the parent repo contains helper scripts under `.github/cloudflare` for creating and rotating deploy tokens.

Quick deploy with GitHub Actions

1. Add a repository secret named `CLOUDFLARE_API_TOKEN` with a token that has `Workers` and `Account` permissions to publish scripts and manage routes.
2. The repository includes a GitHub Actions workflow at `.github/workflows/deploy-worker.yml` which will run `wrangler publish` on pushes to `main`.
3. The `wrangler.toml` in the repo binds the worker to `lchaty.com/api/subscribe` — ensure the Cloudflare account (account_id in the file) has that zone.

Local test using wrangler (after installing wrangler):

```powershell
# Authenticate wrangler (Interactive) and publish locally:
wrangler login
wrangler publish
```

Using D1 for signups

This repo includes a D1 migration `migrations/001_create_signups.sql` and the worker is configured to use a D1 binding named `LCHATY_BETA` (database name `lchaty_beta`). To create and migrate the database:

1. Create a D1 database in the Cloudflare dashboard named `lchaty_beta` (or use `wrangler d1 create`).
2. Bind the D1 database to the worker in `wrangler.toml` (this repo sets binding `LCHATY_BETA`).
3. Apply the migration using wrangler:

```powershell
# from repo root
wrangler d1 put-migration --name create_signups migrations/001_create_signups.sql
wrangler d1 publish-migration --database-name lchaty_beta --migration-name create_signups
```

Note: `wrangler d1` commands require the latest wrangler beta in some setups. If you prefer, create the table manually in the dashboard SQL console using the SQL in `migrations/001_create_signups.sql`.



Contact: info@lchaty.com
