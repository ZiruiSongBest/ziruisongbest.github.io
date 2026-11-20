/* Zirui Song — homepage behaviour: nav highlight, theme toggle, scroll reveals,
   stat count-up, terminal playback, and live ChemLab-Assets repo numbers. */
(function () {
  var doc = document.documentElement;
  window.__siteReady = true;
  var hasIO = 'IntersectionObserver' in window;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── nav: highlight the link for the section in view ── */
  var links = Array.prototype.slice.call(document.querySelectorAll('#site-nav a'));
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

  /* ── live numbers from the public GitHub API (static values stay as fallback) ── */
  var REPO_API = 'https://api.github.com/repos/mbzuai-nlp/ChemLab-Assets';
  var CACHE_KEY = 'chemlab-repo-v1';
  function applyRepo(data) {
    if (!data) return;
    if (typeof data.stars === 'number') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-stars]'), function (el) {
        el.textContent = data.stars.toLocaleString('en-US');
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
  var cached = null;
  try { cached = JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch (e) {}
  if (cached) {
    applyRepo(cached);
  } else if (window.fetch) {
    fetch(REPO_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (!json) return;
        var data = { stars: json.stargazers_count, pushed: json.pushed_at };
        applyRepo(data);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      })
      .catch(function () {});
  }
})();
