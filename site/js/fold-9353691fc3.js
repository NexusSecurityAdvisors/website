/* Open folded sections when a link points inside them, and before printing. */
(function () {
  'use strict';
  function openFor(id) {
    if (!id) return;
    var t = document.getElementById(decodeURIComponent(id));
    if (!t) return;
    var d = t.closest && t.closest('details.fold');
    if (d && !d.open) { d.open = true; setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 30); }
  }
  function fromHash() { openFor((location.hash || '').slice(1)); }
  fromHash();
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) openFor(a.getAttribute('href').slice(1));
  });
  window.addEventListener('beforeprint', function () {
    [].forEach.call(document.querySelectorAll('details.fold'), function (d) { d.open = true; });
  });
})();
