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

Contact: info@lchaty.com
