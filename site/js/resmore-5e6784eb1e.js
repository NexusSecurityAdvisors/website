/* Resource Library: show the first few cards in each category with a "Show all" button.
   Any active search or filter shows every match (collapse is turned off while filtering). */
(function () {
  'use strict';
  var root = document.getElementById('nsa');
  if (!root) return;
  var secs = [].slice.call(root.querySelectorAll('.rsec'));
  if (!secs.length) return;
  var q = document.getElementById('q'), sels = ['fcat', 'frole', 'fcost'].map(function (id) { return document.getElementById(id); });
  var phone = window.matchMedia && window.matchMedia('(max-width: 600px)');

  function limit() { return phone && phone.matches ? 0 : 3; }

  function label(s, n) {
        return s.classList.contains('open') ? 'Show fewer' : 'Show all ' + n + ' ' + (n === 1 ? 'resource' : 'resources');
  }

  function layout() {
    var lim = limit();
    secs.forEach(function (s) {
      var cards = [].slice.call(s.querySelectorAll('.res'));
      cards.forEach(function (c, i) { c.classList.toggle('xtra', i >= lim); });
      var btn = s.querySelector('.rmore');
      if (cards.length <= lim) { if (btn) btn.remove(); return; }
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rmore';
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
          var open = s.classList.toggle('open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
          btn.textContent = label(s, cards.length);
          if (!open) s.scrollIntoView({ block: 'start' });
        });
        var grid = s.querySelector('.rgrid');
        (grid || s).insertAdjacentElement(grid ? 'afterend' : 'beforeend', btn);
      }
      btn.textContent = label(s, cards.length);
    });
  }

  function filtering() {
    var on = !!(q && q.value.trim()) || sels.some(function (el) { return el && el.value !== 'all'; });
    root.classList.toggle('filtering', on);
  }

  layout();
  filtering();
  if (q) q.addEventListener('input', filtering);
  sels.forEach(function (el) { if (el) el.addEventListener('change', filtering); });
  window.addEventListener('hashchange', function () { setTimeout(filtering, 0); });
  if (phone && phone.addEventListener) phone.addEventListener('change', layout);
})();
