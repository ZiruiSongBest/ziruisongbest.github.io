# ziruisongbest.github.io — Zirui Song's homepage

A personal homepage connecting Zirui's research background with his entrepreneurial
focus on autonomous chemistry labs and chemical reaction simulation. The page
opens with a short bio and the two building directions, followed by selected
research, recent updates, background, and contact. Longer research and career
archives for updates and career details use native HTML disclosure elements. All
selected publications are displayed directly. Plain static HTML/CSS, with no
build step or framework.

## Structure

`index.html` contains the page content and `css/style.css` defines the responsive
layout. `js/main.js` highlights the navigation link for the section in view.
`files/` and `images/` hold PDFs, figures, logos, and photos. `.nojekyll` lets
GitHub Pages serve the repository as static files.

## Editing content

Edit the sections in `index.html`. Headings use normal HTML heading elements,
and navigation links point to section IDs. `<details>` elements hold earlier
updates, career details, honors, service, and writing.
No rebuild is needed. Publishing requires committing and pushing the changes.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Earlier versions of this site (a Jekyll build, then an interactive Three.js 3D
study) are preserved in git history.
