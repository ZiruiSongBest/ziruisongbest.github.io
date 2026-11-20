#!/usr/bin/env python3
"""Rebuild blog/posts.json and blog/feed.xml from the Markdown files in blog/posts/.

Run it after adding or editing a post:

    python3 blog/build.py

Every post is one Markdown file whose name is its URL slug (my-post.md ->
blog/post.html?p=my-post). It starts with a front-matter block:

    ---
    title: A readable title
    date: 2026-11-20          # or 2026-11 when the day does not matter
    tags: [notes, chemistry]
    lang: zh                  # optional, shows a 中文 label
    summary: One sentence for the list page.   # optional
    link: https://...         # optional: the post lives elsewhere
    draft: true               # optional: keep it out of the list and the feed
    ---

Files whose name starts with "_" are never listed. Standard library only.
"""
import json
import re
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

SITE = "https://ziruisongbest.github.io"
BLOG = Path(__file__).resolve().parent
POSTS = BLOG / "posts"
FEED_TITLE = "Zirui Song · Blog"
FEED_DESCRIPTION = "Notes from research and building."


def parse(path):
    """Split a post into (front matter dict, body)."""
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    match = re.match(r"\A---\n(.*?)\n---[ \t]*(?:\n|\Z)", text, re.S)
    if not match:
        raise ValueError("no front matter block (--- ... ---) at the top")
    meta = {}
    for line in match.group(1).split("\n"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            raise ValueError("front matter line without a colon: %r" % line)
        value = re.sub(r"\s+#.*$", "", value).strip()
        if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        meta[key.strip().lower()] = value
    return meta, text[match.end():]


def tags_of(value):
    return [t.strip().strip("\"'") for t in value.strip("[]").split(",") if t.strip()]


def plain(body):
    """Body text with code blocks and Markdown punctuation removed."""
    body = re.sub(r"```.*?```|~~~.*?~~~", " ", body, flags=re.S)
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", body)
    body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)
    return re.sub(r"[`*_>#|]", "", body)


def minutes(body):
    text = plain(body)
    words = len(re.findall(r"[A-Za-z0-9']+", text))
    cjk = len(re.findall(r"[㐀-鿿]", text))
    return max(1, round(words / 220 + cjk / 350))


def first_paragraph(body):
    for block in re.split(r"\n\s*\n", re.sub(r"```.*?```", "", body, flags=re.S)):
        block = block.strip()
        if block and not block.startswith(("#", "!", "|", "$$", "<", "---")):
            text = " ".join(plain(block).split())
            return text if len(text) <= 160 else text[:157].rstrip() + "…"
    return ""


def absolute(url):
    return SITE + url if url.startswith("/") else url


def main():
    posts, skipped, errors = [], [], []
    for path in sorted(POSTS.glob("*.md")):
        if path.name.startswith("_"):
            continue
        try:
            meta, body = parse(path)
            if meta.get("draft", "").lower() in ("true", "yes", "1"):
                skipped.append(path.name)
                continue
            if not meta.get("title"):
                raise ValueError("missing title")
            if not re.fullmatch(r"\d{4}-\d{2}(-\d{2})?", meta.get("date", "")):
                raise ValueError("date must look like 2026-11-20 or 2026-11")
            if not re.fullmatch(r"[\w-]+", path.stem):
                raise ValueError("file name may only use letters, digits, - and _")
        except ValueError as err:
            errors.append("%s: %s" % (path.name, err))
            continue
        post = {"slug": path.stem, "title": meta["title"], "date": meta["date"],
                "tags": tags_of(meta.get("tags", ""))}
        if meta.get("lang"):
            post["lang"] = meta["lang"]
        if meta.get("link"):
            post["link"] = meta["link"]
        else:
            post["minutes"] = minutes(body)
        summary = meta.get("summary") or ("" if meta.get("link") else first_paragraph(body))
        if summary:
            post["summary"] = summary
        posts.append(post)

    if errors:
        sys.exit("Fix these posts first:\n  " + "\n  ".join(errors))

    posts.sort(key=lambda p: p["title"].lower())
    posts.sort(key=lambda p: p["date"], reverse=True)
    (BLOG / "posts.json").write_text(
        json.dumps({"posts": posts}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def stamp(date):
        parts = [int(x) for x in date.split("-")] + [1]
        return format_datetime(datetime(parts[0], parts[1], parts[2], tzinfo=timezone.utc))

    items = []
    for post in posts[:30]:
        url = absolute(post.get("link") or "/blog/post.html?p=" + post["slug"])
        items.append(
            "    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s</link>\n"
            "      <guid isPermaLink=\"false\">%s</guid>\n"
            "      <pubDate>%s</pubDate>\n"
            "      <description>%s</description>\n"
            "    </item>\n" % (escape(post["title"]), escape(url), escape("blog:" + post["slug"]),
                               stamp(post["date"]), escape(post.get("summary", ""))))
    feed = (
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
        "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n"
        "  <channel>\n"
        "    <title>%s</title>\n"
        "    <link>%s/blog/</link>\n"
        "    <atom:link href=\"%s/blog/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n"
        "    <description>%s</description>\n"
        "%s%s"
        "  </channel>\n"
        "</rss>\n" % (escape(FEED_TITLE), SITE, SITE, escape(FEED_DESCRIPTION),
                      "    <lastBuildDate>%s</lastBuildDate>\n" % stamp(posts[0]["date"]) if posts else "",
                      "".join(items)))
    (BLOG / "feed.xml").write_text(feed, encoding="utf-8")

    print("%d post%s -> blog/posts.json, blog/feed.xml" % (len(posts), "" if len(posts) == 1 else "s"))
    if skipped:
        print("drafts left out: " + ", ".join(skipped))


if __name__ == "__main__":
    main()
