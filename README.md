# /tmp Seoul landing

Static landing page and application-form mockup for `/tmp Seoul`.

## Local preview

```bash
npm start
```

Open `http://127.0.0.1:4174/`.

## Current submit mode

The form currently stores a local browser draft and redirects to `submitted.html`.
Notion submission can be enabled later through `api/apply.js` and Vercel environment variables.

## Notion environment variables

Copy `.env.example` to `.env` for local Notion testing once a Notion integration token is available.
