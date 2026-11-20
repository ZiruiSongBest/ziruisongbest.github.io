# ziruisongbest.github.io — Zirui Song's homepage

A personal homepage connecting Zirui's research background with his entrepreneurial
focus on autonomous chemistry labs and chemical reaction simulation. The page
opens with a short bio, then features the ChemLab-Assets open-source project and
the two building directions, followed by selected research, recent updates,
background, and contact. Longer research and career
archives for updates and career details use native HTML disclosure elements. All
selected publications are displayed directly. Plain static HTML/CSS with no
framework; the only generated files are the blog index and feed. A Markdown blog
lives under `blog/`.

## Structure

`index.html` contains the page content and `css/style.css` defines the responsive
layout, including the light and dark themes (CSS variables at the top of the
file). `js/main.js` handles the navigation highlight, theme toggle, scroll
reveals, and the live star count and last-push date for ChemLab-Assets, read
from the public GitHub API with static fallbacks in the HTML. The instrument
strip in the ChemLab card is loaded from the ChemLab-Assets project site.
`files/` and `images/` hold PDFs, figures, logos, and photos. `.nojekyll` lets
GitHub Pages serve the repository as static files.

## Blog

The blog lives in `blog/`: `index.html` lists the posts, `post.html?p=<slug>`
renders one. Each post is a Markdown file in `blog/posts/` whose file name is
its slug. To publish a post:

1. Copy `blog/posts/_template.md` to `blog/posts/my-post.md` and write. The
   block at the top sets `title`, `date` (`2026-11-20`, or `2026-11`), `tags`,
   and optionally `lang: zh`, `summary`, `link` (the post lives on another
   site), or `draft: true`.
2. Run `python3 blog/build.py`. It regenerates `blog/posts.json` (the list the
   pages read) and `blog/feed.xml` (RSS). It needs only the standard library.
3. Commit and push.

Drafts and files starting with `_` are left out of the list and the feed, but
can still be previewed at `blog/post.html?p=<slug>`. Images go next to the
posts (for example `blog/posts/img/`) and are referenced relative to the
Markdown file. Posts support GitHub-flavoured Markdown, fenced code with
highlighting, and LaTeX math in `$...$` and `$$...$$`. `js/blog.js` does the
rendering and loads marked, highlight.js, and KaTeX from a CDN only when a post
needs them; `css/blog.css` holds the blog styles. The homepage shows the three
newest posts from the same `posts.json`.

## Editing content

Edit the sections in `index.html`. Headings use normal HTML heading elements,
and navigation links point to section IDs. `<details>` elements hold earlier
updates, career details, honors, and service.
No rebuild is needed for the homepage (the blog index is the one generated file).
Publishing requires committing and pushing the changes.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Earlier versions of this site (a Jekyll build, then an interactive Three.js 3D
study) are preserved in git history.
