# ziruisongbest.github.io — Zirui Song's 3D homepage

An interactive 3D study built with [Three.js](https://threejs.org/). Every glowing
object in the room opens one chapter of the CV:

| Object | Section |
|---|---|
| 💻 Laptop on the desk | About Me |
| 📰 Corkboard | News |
| 📚 Bookshelf | Publications |
| 🌍 Globe | Research Interests |
| 🎓 Framed diplomas + cap | Education |
| 💼 Briefcase | Experience |
| 🏆 Trophy pedestal | Honors & Awards |
| 🗄️ Filing cabinet | Academic Service |
| 📓 Notebook on the coffee table | Blog & Resources |
| 🪟 Window (desert view) | Now |
| ☎️ Red telephone | Contact |

## Structure

- `index.html` — all personal content lives here as plain HTML (crawlable, works without WebGL)
- `js/main.js` — the Three.js scene, interactions and camera work
- `css/style.css` — HUD, panels, 2D fallback mode
- `files/`, `images/` — PDFs, paper figures, logos, photos
- `.nojekyll` — GitHub Pages serves this repo as plain static files (no build step)

## Editing content

Open `index.html` and edit the `<section class="content">` blocks — news items,
publications, etc. are ordinary HTML lists. No rebuild needed; just commit and push.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

The previous Jekyll site is preserved in git history (`git log -- _pages/about.md`).
