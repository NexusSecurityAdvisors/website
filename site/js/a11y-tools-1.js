/* Nexus accessibility tools: read-aloud (browser speech, no third party) and
   free page translation links (Google Translate web proxy). No data leaves the
   browser unless the visitor chooses a translation link. Versioned filename:
   /js/* is cached for a year, so rename (a11y-tools-2.js) when changing it. */
(function () {
  'use strict';
  if (window.__nsaA11y) return; window.__nsaA11y = 1;
  var d = document, w = window;
  var host = location.hostname;
  var onProxy = /\.translate\.goog$/.test(host);

  var css = d.createElement('link');
  css.rel = 'stylesheet'; css.href = '/js/a11y-tools-1.css';
  d.head.appendChild(css);

  var LANGS = [
    { code: 'es', label: 'Español', hl: 'es' },
    { code: 'it', label: 'Italiano', hl: 'it' },
    { code: 'pt', label: 'Português (Brasil)', hl: 'pt-BR', lang: 'pt-BR' },
    { code: 'pt-PT', label: 'Português (Portugal)', hl: 'pt-PT', lang: 'pt-PT' }
  ];
  function proxyUrl(tl, hl) {
    var h = 'www-nexussecurityadvisors-com.translate.goog';
    return 'https://' + h + location.pathname + '?_x_tr_sl=en&_x_tr_tl=' + encodeURIComponent(tl) +
      '&_x_tr_hl=' + encodeURIComponent(hl) + '&_x_tr_pto=wapp' + location.hash;
  }
  function el(tag, attrs, text) {
    var e = d.createElement(tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  var wrap = el('div', { 'class': 'nsa-a11y', 'id': 'nsa-a11y' });
  var btn = el('button', { type: 'button', 'class': 'nsa-a11y-btn', 'aria-expanded': 'false', 'aria-controls': 'nsa-a11y-panel' });
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4" r="2"/><path d="M4 8.5l8 1.5 8-1.5.4 1.9-5.4 1.1V14l2 7-1.9.6L12 16l-3.1 5.6L7 21l2-7v-2.5L3.6 10.4z"/></svg><span>Accessibility &amp; language</span>';
  var panel = el('div', { 'class': 'nsa-a11y-panel', id: 'nsa-a11y-panel', role: 'region', 'aria-label': 'Accessibility and language tools', hidden: '' });

  // ---- read aloud
  var synth = w.speechSynthesis, canSpeak = !!(synth && w.SpeechSynthesisUtterance);
  var status = el('p', { 'class': 'nsa-a11y-status', role: 'status', 'aria-live': 'polite' });
  if (canSpeak) {
    panel.appendChild(el('h2', {}, 'Listen to this page'));
    var row = el('div', { 'class': 'nsa-a11y-row' });
    var play = el('button', { type: 'button' }, 'Play');
    var pause = el('button', { type: 'button', disabled: '' }, 'Pause');
    var stop = el('button', { type: 'button', disabled: '' }, 'Stop');
    row.appendChild(play); row.appendChild(pause); row.appendChild(stop);
    panel.appendChild(row); panel.appendChild(status);

    var queue = [], idx = 0, speaking = false;
    function collect() {
      var root = d.getElementById('nsa') || d.querySelector('main') || d.body;
      var text = [];
      var walker = d.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          if (!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (p.closest('script,style,noscript,svg,[aria-hidden="true"],[hidden],.nsa-a11y,nav,.bar,footer,.skip,.totop')) return NodeFilter.FILTER_REJECT;
          var cs = w.getComputedStyle(p);
          if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) text.push(walker.currentNode.nodeValue.replace(/\s+/g, ' ').trim());
      var all = text.join(' ').replace(/\s+/g, ' ');
      // Chrome stops long utterances, so speak sentence-sized chunks.
      return all.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [];
    }
    function setState(s) {
      speaking = s === 'playing';
      play.textContent = s === 'paused' ? 'Resume' : 'Play';
      play.disabled = s === 'playing';
      pause.disabled = s !== 'playing';
      stop.disabled = s === 'idle';
      status.textContent = s === 'playing' ? 'Reading aloud…' : s === 'paused' ? 'Paused.' : '';
    }
    function next() {
      if (idx >= queue.length) { setState('idle'); return; }
      var u = new SpeechSynthesisUtterance(queue[idx++]);
      u.lang = d.documentElement.lang || 'en-US';
      u.rate = 1;
      u.onend = function () { if (speaking) next(); };
      u.onerror = function () { setState('idle'); };
      synth.speak(u);
    }
    play.addEventListener('click', function () {
      if (synth.paused) { synth.resume(); setState('playing'); return; }
      synth.cancel(); queue = collect(); idx = 0;
      if (!queue.length) { status.textContent = 'Nothing to read on this page.'; return; }
      setState('playing'); next();
    });
    pause.addEventListener('click', function () { synth.pause(); speaking = false; setState('paused'); });
    stop.addEventListener('click', function () { speaking = false; synth.cancel(); setState('idle'); });
    w.addEventListener('pagehide', function () { synth.cancel(); });
  }

  // ---- translation
  panel.appendChild(el('h2', {}, onProxy ? 'Language' : 'Translate this page'));
  var ul = el('ul', { 'class': 'nsa-a11y-langs' });
  if (onProxy) {
    var li0 = el('li'); var en = el('a', { href: 'https://www.nexussecurityadvisors.com' + location.pathname, lang: 'en', hreflang: 'en' }, 'English (original)');
    li0.appendChild(en); ul.appendChild(li0);
  }
  LANGS.forEach(function (L) {
    var li = el('li');
    var a = el('a', { href: proxyUrl(L.code, L.hl), lang: L.lang || L.code, hreflang: L.lang || L.code, rel: 'nofollow' }, L.label);
    li.appendChild(a); ul.appendChild(li);
  });
  panel.appendChild(ul);
  panel.appendChild(el('p', { 'class': 'nsa-a11y-note' }, 'Machine translation by Google Translate. The English page is the authoritative version.'));

  var help = el('p', { 'class': 'nsa-a11y-note' });
  var ha = el('a', { href: '/trust#accessibility' }, 'Accessibility help and contact');
  help.appendChild(ha); panel.appendChild(help);

  wrap.appendChild(panel); wrap.appendChild(btn);

  function open(v) {
    btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    if (v) { panel.removeAttribute('hidden'); var f = panel.querySelector('button:not([disabled]),a'); if (f) f.focus(); }
    else panel.setAttribute('hidden', '');
  }
  btn.addEventListener('click', function () { open(btn.getAttribute('aria-expanded') !== 'true'); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { open(false); btn.focus(); }
  });
  d.addEventListener('click', function (e) {
    if (btn.getAttribute('aria-expanded') === 'true' && !wrap.contains(e.target)) open(false);
  });

  function mount() { d.body.appendChild(wrap); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mount); else mount();
})();
