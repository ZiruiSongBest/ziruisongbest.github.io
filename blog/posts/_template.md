---
title: Post template and formatting reference
date: 2026-11-20
tags: [meta]
summary: Copy this file to start a new post. It also shows everything the blog can render.
draft: true
---

Copy this file, rename it (the file name becomes the URL), edit the block above,
remove the `draft: true` line, and run `python3 blog/build.py`. Files starting with `_`
are never listed, so this one stays out of the blog. It is still reachable at
`blog/post.html?p=_template` as a preview of the formatting below.

## Text

A paragraph with **bold**, *italic*, `inline code`, and a [link](https://github.com/mbzuai-nlp/ChemLab-Assets).
中文和 English 可以混排，标题、正文和代码都有对应的字体回退。

> A blockquote, for a claim worth setting apart or a line quoted from a paper.

- A bullet list
- With a nested item
  - like this one
- [x] and task items
- [ ] that are still open

1. A numbered list
2. With a second step

## Code

```python
def arrhenius(a, ea, temperature, r=8.314):
    """Rate constant from the Arrhenius equation."""
    return a * math.exp(-ea / (r * temperature))
```

```bash
chemlab run ika_plate_rctdigital set-temp 80C
```

## Math

Inline math sits in single dollars, $k = A e^{-E_a / RT}$, and display math in double dollars:

$$
\mathcal{L}(\theta) = -\frac{1}{N} \sum_{i=1}^{N} \log p_\theta(y_i \mid x_i)
$$

A price such as \$5 needs a backslash before the dollar sign.

## Tables and images

| Mode     | Driver            | Output           |
| -------- | ----------------- | ---------------- |
| Embodied | Isaac Sim / USD   | Joint commands   |
| Agentic  | `chemlab` CLI     | Instrument state |

Image paths are relative to this file, so put pictures in `blog/posts/img/` and write
`![caption](img/picture.png)`.

### A third-level heading

Posts with three or more headings get an "On this page" outline on wide screens.

---

That is everything.
