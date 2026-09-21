# Ka$h Repo

Photos and their metadata (title, date, location, note) live in Cloudinary. The site reads them via `/api/photos`; there's no local `pics/` folder or manifest to hand-edit anymore.

## Adding a photo

1. Go to `/login.html` and log in with the shared password.
2. On `/upload.html`, pick a photo. Title is guessed from the filename and the date/GPS location are read from the photo's EXIF data when available — both are editable before you submit.
3. Submit. The photo uploads directly to Cloudinary, then its metadata is saved.

## Running locally

This is a [Vercel](https://vercel.com) project (static frontend + serverless functions in `api/`). Install the Vercel CLI and run:

```
npm install
vercel dev
```

### Environment variables

Set these in a local `.env` file (for `vercel dev` and the migration script) and in the Vercel project's settings for deployment:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary account
- `UPLOAD_PASSWORD` — the shared password for `/login.html`
- `SESSION_SECRET` — any long random string, used to sign the login session cookie

### One-time migration

The photos originally in `pics/` were migrated into Cloudinary with `npm run migrate` (reads `pics/manifest.txt`, uploads each file, sets its metadata). `pics/` has since been removed from the repo — this script is kept in `scripts/` for reference only.
