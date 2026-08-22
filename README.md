# ziruisongbest.github.io — Zirui Song's homepage

A single-page academic homepage: about, news, publications, research interests,
education, experience, awards, service, blog, now, and contact. Plain static
HTML/CSS — no build step, no WebGL, no framework.

## Structure

- `index.html` — all content, as ordinary HTML sections
- `css/style.css` — the whole stylesheet
- `js/main.js` — small script that highlights the nav link for the section in view
- `files/`, `images/` — PDFs, paper figures, logos, photos
- `.nojekyll` — GitHub Pages serves this repo as plain static files (no build step)

## Editing content

Open `index.html` and edit the `<section class="content">` blocks — news items,
publications, etc. are ordinary HTML lists. Each section's heading comes from its
`data-icon` / `data-title` attributes, and the header nav links to its `id`.
No rebuild needed; just commit and push.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Earlier versions of this site (a Jekyll build, then an interactive Three.js 3D
study) are preserved in git history.
