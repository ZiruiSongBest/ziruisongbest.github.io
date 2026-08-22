/* Zirui Song — homepage: highlight the nav link for the section in view. */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('#site-nav a'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var byId = {};
  var sections = [];
  links.forEach(function (link) {
    var section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    byId[section.id] = link;
    sections.push(section);
  });

  var visible = new Set();

  function highlight() {
    var current = sections.filter(function (s) { return visible.has(s.id); })[0];
    links.forEach(function (link) { link.classList.remove('active'); });
    if (current) byId[current.id].classList.add('active');
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    });
    highlight();
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(function (s) { observer.observe(s); });
})();
