/* Zirui Song — shared behaviour: nav highlight, theme toggle, scroll reveals,
   stat count-up, terminal playback, and live ChemLab-Assets repo numbers.
   The blog pages load this too (theme toggle); the blog itself is js/blog.js. */
(function () {
  var doc = document.documentElement;
  window.__siteReady = true;
  var hasIO = 'IntersectionObserver' in window;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── nav: highlight the link for the section in view ── */
  var links = Array.prototype.slice.call(document.querySelectorAll('#site-nav a[href^="#"]'));
  if (links.length && hasIO) {
    var byId = {};
    var sections = [];
    links.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (!section) return;
      byId[section.id] = link;
      sections.push(section);
    });
    var visible = new Set();
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      var current = sections.filter(function (s) { return visible.has(s.id); })[0];
      links.forEach(function (link) { link.classList.remove('active'); });
      if (current) byId[current.id].classList.add('active');
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* on narrow screens the nav scrolls sideways: keep the current page's link in view */
  var nav = document.getElementById('site-nav');
  var currentLink = nav && nav.querySelector('.active');
  if (currentLink && nav.scrollWidth > nav.clientWidth) {
    var offset = currentLink.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollLeft += offset - (nav.clientWidth - currentLink.offsetWidth) / 2;
  }

  /* ── theme toggle (light by default, choice remembered) ── */
  var toggle = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncThemeMeta() {
    if (themeMeta) themeMeta.setAttribute('content', doc.getAttribute('data-theme') === 'dark' ? '#0c1211' : '#f5f7f6');
  }
  syncThemeMeta();
  if (toggle) {
    toggle.addEventListener('click', function () {
      var dark = doc.getAttribute('data-theme') !== 'dark';
      if (dark) doc.setAttribute('data-theme', 'dark');
      else doc.removeAttribute('data-theme');
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      syncThemeMeta();
    });
  }

  /* ── count-up for the ChemLab stats ── */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (!target || reduceMotion) return;
    var start = null;
    var duration = 1100;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── terminal: play the session line by line once it scrolls into view ── */
  function playTerminal(term) {
    var delay = 0;
    Array.prototype.forEach.call(term.querySelectorAll('.t-line'), function (line) {
      delay += line.classList.contains('t-cmd') ? 420 : 150;
      line.style.transitionDelay = delay + 'ms';
    });
    term.classList.add('run');
  }

  /* ── reveal on scroll ── */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var terminal = document.getElementById('lab-terminal');
  function show(el) {
    el.classList.add('in');
    Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), countUp);
  }
  if (hasIO) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { revealObserver.observe(el); });

    if (terminal) {
      var termObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        playTerminal(terminal);
        termObserver.disconnect();
      }, { threshold: 0.35 });
      termObserver.observe(terminal);
    }
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
    if (terminal) terminal.classList.add('run');
  }

  /* ── live numbers for ChemLab-Assets (the values in the HTML stay as fallback) ──
     The GitHub API allows 60 unauthenticated requests per hour per IP, which a
     shared campus or office network can use up; shields.io (cached server side,
     no per-visitor limit) then supplies the star count. Each browser asks at
     most once a day; the answer is kept in localStorage in between. */
  var REPO_API = 'https://api.github.com/repos/mbzuai-nlp/ChemLab-Assets';
  var STARS_FALLBACK = 'https://img.shields.io/github/stars/mbzuai-nlp/ChemLab-Assets.json';
  var CACHE_KEY = 'chemlab-repo-v2';
  var CACHE_MS = 24 * 60 * 60 * 1000;
  function applyRepo(data) {
    if (!data) return;
    if (typeof data.stars === 'number' || typeof data.stars === 'string') {
      var stars = typeof data.stars === 'number' ? data.stars.toLocaleString('en-US') : data.stars;
      Array.prototype.forEach.call(document.querySelectorAll('[data-stars]'), function (el) {
        el.textContent = stars;
      });
    }
    var pushed = data.pushed && new Date(data.pushed);
    if (pushed && !isNaN(pushed)) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-pushed]'), function (el) {
        el.setAttribute('datetime', data.pushed.slice(0, 10));
        el.textContent = pushed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      });
    }
  }
  function getJson(url, headers) {
    return fetch(url, { headers: headers || {} }).then(function (res) {
      if (!res.ok) throw new Error(url + ' ' + res.status);
      return res.json();
    });
  }
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
  if (cached && !(Date.now() - cached.at < CACHE_MS)) cached = null;
  if (!document.querySelector('[data-stars], [data-pushed]')) {
    /* pages without the ChemLab card (the blog) have nothing to update */
  } else if (cached) {
    applyRepo(cached);
  } else if (window.fetch) {
    getJson(REPO_API, { Accept: 'application/vnd.github+json' })
      .then(function (json) {
        if (typeof json.stargazers_count !== 'number') throw new Error('no star count');
        return { stars: json.stargazers_count, pushed: json.pushed_at };
      })
      .catch(function () {
        return getJson(STARS_FALLBACK).then(function (json) {
          var value = String(json.value || json.message || '');
          if (!/^\d[\d.,]*k?$/i.test(value)) throw new Error('no star count');
          return { stars: /^\d+$/.test(value) ? parseInt(value, 10) : value };
        });
      })
      .then(function (data) {
        applyRepo(data);
        data.at = Date.now();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      })
      .catch(function () {});
  }
})();
