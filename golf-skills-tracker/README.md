# Golf Skills Challenges

A small website for your golf pupils to log their scores on the skills challenges you set them, and see how their
best score compares against a reference "key" graph you upload.

## What's in here

- **You (the coach)** log in with a username and password. You can:
  - Add/rename/remove pupils.
  - Create skills challenges (name, description, whether a higher or lower number is the better score).
  - Upload a reference "key" graph image for each challenge, and calibrate it (see below) so pupils' best scores
    plot correctly on it.
  - See every score anyone has submitted, and delete any that shouldn't be there.
- **Pupils** log in by simply picking their name from a list — no password. They can:
  - Submit a score for any challenge.
  - See their full history of scores for a challenge (date and time included), and edit or delete their own entries.
  - Visit the **Key** page to see every challenge's reference graph with a ⭐ marking their personal best.

## How the "Key" graph calibration works

You upload the graph image exactly as you have it (a screenshot, a photo, an exported chart — anything). Because it's
just a picture, the site doesn't automatically know what the axis values mean, so on the challenge's edit page there's
a small calibration tool:

1. Click **Set point A**, then click anywhere on the image where you know the score value (e.g. the bottom of the
   scale) and type that value into the "Value at point A" box.
2. Click **Set point B**, then click a different point on the image where you know the score value (e.g. the top of
   the scale), and type that value in too.
3. Save. From then on, whenever a pupil has a best score for that challenge, the site works out where it belongs on
   the image (by drawing a straight line between your two points) and drops a gold ⭐ marker there.

You only need to do this once per challenge. If you replace the image later, just redo the two calibration clicks.

## Running it locally

```bash
npm install
cp .env.example .env   # then edit .env with your own values
npm start
```

You'll need a PostgreSQL database for local development. If you have Postgres installed, create one with:

```bash
createdb golf_skills
```

and point `DATABASE_URL` in `.env` at it, e.g. `postgres://YOUR_USER@localhost:5432/golf_skills` (and set
`DATABASE_SSL=false` for a plain local Postgres).

The app creates its own tables automatically on startup — there's nothing to run manually.

## Deploying to Render

1. Push this project to a GitHub repository (Render deploys from a repo).
2. In Render, create a **PostgreSQL** database (the free tier is fine to start). Copy its **Internal Database URL**.
3. In Render, create a **Web Service** from your repo, with:
   - Build command: `npm install`
   - Start command: `npm start`
4. Under the web service's **Environment** tab, add these variables:
   - `DATABASE_URL` — the Internal Database URL from step 2
   - `DATABASE_SSL` — `true`
   - `ADMIN_USERNAME` — a username only you know
   - `ADMIN_PASSWORD` — a password only you know
   - `SESSION_SECRET` — any long random string (this keeps login cookies secure)
5. Deploy. Once it's live, visit the site, log in as coach (`/login/admin`), add your pupils and challenges, and
   upload/calibrate each challenge's key graph.

**A note on Render's free tier:** free Postgres databases on Render currently expire after a period of time unless
upgraded to a paid plan. If you want pupils' scores to be kept indefinitely without needing to think about this,
either use a paid Render Postgres plan, or point `DATABASE_URL` at a free database from a provider that doesn't
expire (e.g. Neon or Supabase both have permanent free tiers and work exactly the same way — just paste their
connection string in as `DATABASE_URL`).

**A note on images:** challenge graph images are stored directly in the database (not on disk), so they survive
Render's free-tier restarts and redeploys without any extra configuration.

## Project structure

```
src/
  server.js          entry point
  db.js              database connection + schema
  middleware/auth.js  admin/pupil login checks
  routes/            all the app's URLs, grouped by area
  views/             EJS page templates
  public/            CSS and browser-side JS (calibration tool)
```
