/* Zirui Song — blog: the post list (blog/ and the homepage block), the tag filter,
   and the reader that renders a Markdown post with code highlighting and math. */
(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* libraries are fetched only when a post needs them; the second host is a fallback */
  var CDN = ['https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'];
  var LIBS = {
    marked: 'marked@18.2.1/lib/marked.umd.js',
    katex: 'katex@0.19.1/dist/katex.min.js',
    katexCss: 'katex@0.19.1/dist/katex.min.css',
    hljs: '@highlightjs/cdn-assets@11.12.0/highlight.min.js'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* "2026-11-20" -> "Nov 20, 2026", "2026-11" -> "Nov 2026" */
  function formatDate(date) {
    var parts = String(date).split('-');
    var month = MONTHS[parseInt(parts[1], 10) - 1];
    if (!month) return String(date);
    return parts[2] ? month + ' ' + parseInt(parts[2], 10) + ', ' + parts[0] : month + ' ' + parts[0];
  }
  function langLabel(lang) {
    if (!lang || /^en/i.test(lang)) return '';
    return /^zh/i.test(lang) ? '中文' : lang.toUpperCase();
  }

  function load(path, make, i) {
    i = i || 0;
    return new Promise(function (resolve, reject) {
      var node = make(CDN[i] + path);
      node.onload = function () { resolve(); };
      node.onerror = function () {
        node.remove();
        if (i + 1 < CDN.length) load(path, make, i + 1).then(resolve, reject);
        else reject(new Error('could not load ' + path));
      };
      document.head.appendChild(node);
    });
  }
  function loadScript(path) {
    return load(path, function (url) { var s = document.createElement('script'); s.src = url; return s; });
  }
  function loadCss(path) {
    return load(path, function (url) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = url; return l; });
  }

  var indexCache = {};
  function loadIndex(base) {
    if (!indexCache[base]) {
      indexCache[base] = fetch(base + 'posts.json', { cache: 'no-cache' })
        .then(function (res) { if (!res.ok) throw new Error('posts.json ' + res.status); return res.json(); })
        .then(function (data) { return (data && data.posts) || []; });
    }
    return indexCache[base];
  }

  function tagLink(tag, base) {
    var a = el('a', 'tag', tag);
    a.href = (base || './') + '?tag=' + encodeURIComponent(tag);
    return a;
  }

  /* one row of the post list */
  function postRow(post, base) {
    var li = el('li', 'post-row');
    var time = el('time', '', formatDate(post.date));
    time.setAttribute('datetime', post.date);
    li.appendChild(time);

    var body = el('div', 'post-row-body');
    var heading = el('h3');
    var link = el('a', '', post.title);
    if (post.link) {
      link.href = post.link;
      link.target = '_blank';
      link.rel = 'noopener';
      heading.appendChild(link);
      var ext = el('span', 'ext', '↗');
      ext.setAttribute('aria-hidden', 'true');
      heading.appendChild(ext);
    } else {
      link.href = base + 'post.html?p=' + encodeURIComponent(post.slug);
      heading.appendChild(link);
    }
    body.appendChild(heading);
    if (post.summary) body.appendChild(el('p', 'post-summary', post.summary));

    var meta = el('p', 'post-meta');
    (post.tags || []).forEach(function (tag) { meta.appendChild(tagLink(tag, base)); });
    var lang = langLabel(post.lang);
    if (lang) meta.appendChild(el('span', '', lang));
    if (post.minutes) meta.appendChild(el('span', '', post.minutes + ' min read'));
    if (meta.childNodes.length) body.appendChild(meta);
    li.appendChild(body);
    return li;
  }

  /* ── blog index: all posts by year, filterable by tag ── */
  function initList(list) {
    var base = list.getAttribute('data-blog-base') || '';
    var filter = document.getElementById('tag-filter');
    var active = new URLSearchParams(location.search).get('tag');

    loadIndex(base).then(function (posts) {
      var counts = {};
      posts.forEach(function (post) {
        (post.tags || []).forEach(function (tag) { counts[tag] = (counts[tag] || 0) + 1; });
      });
      var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
      if (active && !counts[active]) active = null;

      function render() {
        list.textContent = '';
        var shown = active ? posts.filter(function (p) { return (p.tags || []).indexOf(active) > -1; }) : posts;
        if (!shown.length) {
          list.appendChild(el('li', 'post-note', 'Nothing here yet. The first post is on its way.'));
          return;
        }
        var year = null;
        shown.forEach(function (post) {
          var y = String(post.date).slice(0, 4);
          if (y !== year) { year = y; list.appendChild(el('li', 'post-year', y)); }
          list.appendChild(postRow(post, base));
        });
        if (filter) each(filter.querySelectorAll('button'), function (button) {
          button.setAttribute('aria-pressed', String((button.getAttribute('data-tag') || null) === active));
        });
      }

      function select(tag) {
        active = tag;
        try {
          history.replaceState(null, '', tag ? '?tag=' + encodeURIComponent(tag) : location.pathname);
        } catch (e) {}
        render();
      }

      if (filter && tags.length) {
        [null].concat(tags).forEach(function (tag) {
          var item = el('li');
          var button = el('button', '', tag || 'All');
          button.type = 'button';
          if (tag) button.setAttribute('data-tag', tag);
          button.appendChild(el('span', '', String(tag ? counts[tag] : posts.length)));
          button.addEventListener('click', function () { select(tag); });
          item.appendChild(button);
          filter.appendChild(item);
        });
      }
      /* tag chips inside the rows filter in place instead of reloading */
      list.addEventListener('click', function (event) {
        var chip = event.target.closest && event.target.closest('a.tag');
        if (!chip) return;
        event.preventDefault();
        select(chip.textContent);
      });
      render();
    }).catch(function () {
      list.textContent = '';
      list.appendChild(el('li', 'post-note', 'The post list could not be loaded. Please try again.'));
    });
  }

  /* ── homepage: the latest few posts ── */
  function initLatest(box) {
    var base = box.getAttribute('data-blog-base') || '';
    var count = parseInt(box.getAttribute('data-latest-posts'), 10) || 3;
    loadIndex(base).then(function (posts) {
      if (!posts.length) {
        /* nothing published yet: leave the whole section out until there is */
        var section = box.closest && box.closest('section');
        if (section) section.hidden = true;
        return;
      }
      box.textContent = '';
      posts.slice(0, count).forEach(function (post) { box.appendChild(postRow(post, base)); });
    }).catch(function () {});
  }

  /* ── reader ── */
  function splitFrontMatter(src) {
    src = src.replace(/^﻿/, '').replace(/\r\n/g, '\n');
    var match = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
    var meta = {};
    if (!match) return { meta: meta, body: src };
    match[1].split('\n').forEach(function (line) {
      var i = line.indexOf(':');
      if (i < 0 || /^\s*#/.test(line)) return;
      var value = line.slice(i + 1).replace(/\s+#.*$/, '').trim();
      if (value.length > 1 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
        value = value.slice(1, -1);
      }
      meta[line.slice(0, i).trim().toLowerCase()] = value;
    });
    return { meta: meta, body: src.slice(match[0].length) };
  }
  function tagsOf(value) {
    return String(value || '').replace(/^\[|\]$/g, '').split(',')
      .map(function (t) { return t.trim().replace(/^["']|["']$/g, ''); })
      .filter(Boolean);
  }
  function readingMinutes(body) {
    var text = body.replace(/```[\s\S]*?```/g, ' ');
    var words = (text.match(/[A-Za-z0-9']+/g) || []).length;
    var cjk = (text.match(/[㐀-鿿]/g) || []).length;
    return Math.max(1, Math.round(words / 220 + cjk / 350));
  }

  /* pull $…$ and $$…$$ out before Markdown parsing so underscores and
     backslashes inside formulas survive; code spans are left alone */
  function extractMath(src, store) {
    var re = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)|\\\$|\$\$([\s\S]+?)\$\$|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
    return src.replace(re, function (all, code, block, inline) {
      if (code !== undefined || all === '\\$') return all;
      var display = block !== undefined;
      store.push({ tex: (display ? block : inline).trim(), display: display });
      return '⟦math:' + (store.length - 1) + '⟧';
    });
  }

  function slugify(text, used) {
    var id = text.trim().toLowerCase().replace(/[^\w㐀-鿿]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    var base = id;
    for (var n = 2; used[id]; n++) id = base + '-' + n;
    used[id] = true;
    return id;
  }

  function initPost(article) {
    var base = article.getAttribute('data-blog-base') || '';
    var titleEl = document.getElementById('post-title');
    var metaEl = document.getElementById('post-meta');
    var tagsEl = document.getElementById('post-tags');
    var bodyEl = document.getElementById('post-body');
    var navEl = document.getElementById('post-nav');
    var tocEl = document.getElementById('post-toc');
    var slug = new URLSearchParams(location.search).get('p') || '';

    function missing() {
      titleEl.textContent = 'Post not found';
      bodyEl.textContent = '';
      var note = el('p', 'post-note', 'There is no post at this address. ');
      var back = el('a', '', 'See all posts');
      back.href = './';
      note.appendChild(back);
      bodyEl.appendChild(note);
    }
    if (!/^[\w-]+$/.test(slug)) { missing(); return; }

    var mdUrl = new URL(base + 'posts/' + slug + '.md', location.href);
    var source = fetch(mdUrl.href, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('post ' + res.status);
      return res.text();
    });
    var parser = loadScript(LIBS.marked).catch(function () {});

    Promise.all([source, parser]).then(function (loaded) {
      var parsed = splitFrontMatter(loaded[0]);
      var meta = parsed.meta;
      var title = meta.title || slug;

      document.title = title + ' · Zirui Song';
      titleEl.textContent = title;
      if (meta.lang) article.setAttribute('lang', meta.lang);
      var description = document.querySelector('meta[name="description"]');
      if (description && meta.summary) description.setAttribute('content', meta.summary);

      if (meta.date) {
        var time = el('time', '', formatDate(meta.date));
        time.setAttribute('datetime', meta.date);
        metaEl.appendChild(time);
      }
      if (!meta.link) metaEl.appendChild(el('span', 'dot', readingMinutes(parsed.body) + ' min read'));
      if (langLabel(meta.lang)) metaEl.appendChild(el('span', 'dot', langLabel(meta.lang)));
      if (slug.charAt(0) === '_' || /^(true|yes|1)$/i.test(meta.draft || '')) {
        metaEl.appendChild(el('span', 'unlisted', 'not listed'));
      }
      tagsOf(meta.tags).forEach(function (tag) {
        var item = el('li');
        item.appendChild(tagLink(tag, './'));
        tagsEl.appendChild(item);
      });

      bodyEl.textContent = '';
      if (meta.link) {
        var note = el('p', '', 'This post lives elsewhere: ');
        var out = el('a', '', meta.link);
        out.href = meta.link;
        note.appendChild(out);
        bodyEl.appendChild(note);
      } else if (window.marked) {
        var math = [];
        var html = window.marked.parse(extractMath(parsed.body, math), { gfm: true });
        html = html.replace(/⟦math:(\d+)⟧/g, function (all, i) {
          return '<span class="math' + (math[i].display ? ' math-display' : '') + '" data-math="' + i + '"></span>';
        });
        /* a template keeps images from loading before their paths are fixed */
        var holder = document.createElement('template');
        holder.innerHTML = html;
        enhance(holder.content, mdUrl, math);
        bodyEl.appendChild(holder.content);
        afterInsert(math);
      } else {
        /* the Markdown library did not load: show the source as written */
        var raw = el('pre');
        raw.style.whiteSpace = 'pre-wrap';
        raw.textContent = parsed.body.trim();
        bodyEl.appendChild(raw);
      }

      if (location.hash) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
      return loadIndex(base).then(function (posts) {
        var own = posts.filter(function (p) { return !p.link; });
        var at = -1;
        own.forEach(function (p, i) { if (p.slug === slug) at = i; });
        if (at < 0) return;
        [['newer', 'Newer', own[at - 1]], ['older', 'Older', own[at + 1]]].forEach(function (side) {
          if (!side[2]) return;
          var a = el('a', side[0]);
          a.href = 'post.html?p=' + encodeURIComponent(side[2].slug);
          a.appendChild(el('small', '', side[1]));
          a.appendChild(document.createTextNode(side[2].title));
          navEl.appendChild(a);
        });
        if (navEl.childNodes.length) navEl.hidden = false;
      }).catch(function () {});
    }).catch(function (err) {
      if (window.console) console.error(err);
      missing();
    });

    /* fix up the parsed post before it enters the page */
    function enhance(root, mdUrl, math) {
      var postsDir = new URL('.', mdUrl).pathname;
      each(root.querySelectorAll('img[src], video[src], source[src], a[href]'), function (node) {
        var attr = node.hasAttribute('href') ? 'href' : 'src';
        var value = node.getAttribute(attr);
        if (/^#/.test(value)) return;
        var absolute = /^([a-z][a-z0-9+.-]*:|\/)/i.test(value);
        var url;
        try { url = new URL(value, mdUrl); } catch (e) { return; }
        if (!absolute) {
          /* paths are written relative to the Markdown file; a link to another post's .md opens that post */
          var sibling = attr === 'href' && url.pathname.indexOf(postsDir) === 0 && /^([\w-]+)\.md$/.exec(url.pathname.slice(postsDir.length));
          node.setAttribute(attr, sibling ? 'post.html?p=' + sibling[1] + url.hash : url.href);
        } else if (attr === 'href' && /^https?:$/.test(url.protocol) && url.host !== location.host) {
          node.target = '_blank';
          node.rel = 'noopener';
        }
        if (node.tagName === 'IMG') node.loading = 'lazy';
      });
      each(root.querySelectorAll('table'), function (table) {
        var wrap = el('div', 'table-wrap');
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      });
      each(root.querySelectorAll('[data-math]'), function (node) {
        node.textContent = math[node.getAttribute('data-math')].tex;
      });

      var used = {};
      var headings = root.querySelectorAll('h2, h3');
      each(root.querySelectorAll('h2, h3, h4'), function (h) { h.id = slugify(h.textContent, used); });
      if (headings.length >= 3 && tocEl) {
        tocEl.appendChild(el('p', '', 'On this page'));
        var list = el('ol');
        each(headings, function (h) {
          var item = el('li', h.tagName === 'H3' ? 'sub' : '');
          var a = el('a', '', h.textContent);
          a.href = '#' + h.id;
          item.appendChild(a);
          list.appendChild(item);
        });
        tocEl.appendChild(list);
        tocEl.hidden = false;
      }
    }

    /* highlighting and math load only when the post uses them */
    function afterInsert(math) {
      var blocks = bodyEl.querySelectorAll('pre code');
      if (blocks.length) {
        loadScript(LIBS.hljs).then(function () {
          each(blocks, function (block) { window.hljs.highlightElement(block); });
        }).catch(function () {});
      }
      if (math.length) {
        loadCss(LIBS.katexCss).catch(function () {});
        loadScript(LIBS.katex).then(function () {
          each(bodyEl.querySelectorAll('[data-math]'), function (node) {
            var item = math[node.getAttribute('data-math')];
            window.katex.render(item.tex, node, { displayMode: item.display, throwOnError: false });
          });
        }).catch(function () {});
      }
    }
  }

  var list = document.getElementById('post-list');
  if (list) initList(list);
  each(document.querySelectorAll('[data-latest-posts]'), initLatest);
  var article = document.getElementById('post');
  if (article) initPost(article);
})();
