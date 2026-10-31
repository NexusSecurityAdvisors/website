(function () {
  var root = document.getElementById('rc'); if (!root) return;
  var t0 = Date.now(), BANK = null, track = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var steps = [$('rc-s0'), $('rc-s1'), $('rc-s2'), $('rc-s3')], err = $('rc-err');
  function show(n) { steps.forEach(function (s, i) { s.hidden = i !== n; }); err.textContent = ''; var y = root.getBoundingClientRect().top + window.pageYOffset - 90; if (window.pageYOffset > y) window.scrollTo(0, y); }

  fetch('/readiness-bank.json', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (b) {
    BANK = b; var html = '';
    Object.keys(b.tracks).forEach(function (k) {
      var t = b.tracks[k];
      html += '<label class="opt rc-track"><input type="radio" name="track" value="' + esc(k) + '"> <span><b>' + esc(t.title) + '</b><br><small>' + esc(t.blurb) + '</small></span></label>';
    });
    $('rc-tracks').innerHTML = html;
  }).catch(function () { $('rc-tracks').innerHTML = '<p>Sorry, the check could not load. Please refresh the page.</p>'; });

  $('rc-start').addEventListener('click', function () {
    var sel = root.querySelector('input[name=track]:checked');
    if (!sel) { err.textContent = 'Please choose a checklist to continue.'; return; }
    track = sel.value; var t = BANK.tracks[track], html = '';
    $('rc-qtitle').textContent = t.title;
    t.questions.forEach(function (q, i) {
      html += '<div class="q"><span class="ql">' + (i + 1) + '. ' + esc(q.q) + '</span><div class="opts rc-ans">';
      Object.keys(BANK.answers).forEach(function (a) {
        html += '<label class="opt"><input type="radio" name="' + esc(q.id) + '" value="' + esc(a) + '"> ' + esc(BANK.answers[a].label) + '</label>';
      });
      html += '</div></div>';
    });
    $('rc-qs').innerHTML = html; show(1);
  });
  $('rc-back1').addEventListener('click', function () { show(0); });
  $('rc-next').addEventListener('click', function () {
    var miss = BANK.tracks[track].questions.filter(function (q) { return !root.querySelector('input[name="' + q.id + '"]:checked'); });
    if (miss.length) { err.textContent = 'Please answer all ' + BANK.tracks[track].questions.length + ' questions ("Not sure" is fine).'; return; }
    show(2);
  });
  $('rc-back2').addEventListener('click', function () { show(1); });

  $('rc-send').addEventListener('click', function () {
    var c = { name: $('rc-name').value.trim(), email: $('rc-email').value.trim(), company: $('rc-company').value.trim(), role: $('rc-role').value.trim(), size: $('rc-size').value, industry: $('rc-ind').value };
    if (!c.name || !c.company || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) { err.textContent = 'Please enter your name, a valid work email, and company.'; return; }
    if (!$('rc-consent').checked) { err.textContent = 'Please check the consent box to see your results.'; return; }
    var answers = {}; BANK.tracks[track].questions.forEach(function (q) { answers[q.id] = root.querySelector('input[name="' + q.id + '"]:checked').value; });
    var btn = this; btn.disabled = true; btn.textContent = 'Building your report…'; err.textContent = '';
    fetch('/api/readiness', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ track: track, answers: answers, contact: c, consent: true, hp: $('rc-hp').value, elapsed: Date.now() - t0 })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }).then(function (x) {
      btn.disabled = false; btn.textContent = 'See my results →';
      if (!x.ok) { err.textContent = x.d.message || 'Something went wrong. Please try again, or email info@nexussecurityadvisors.com.'; return; }
      render(x.d, c);
    }).catch(function () { btn.disabled = false; btn.textContent = 'See my results →'; err.textContent = 'Network error. Please try again.'; });
  });

  function render(d, c) {
    $('rc-score').textContent = d.percent + '%';
    $('rc-band').textContent = d.band + ' — ' + d.track;
    $('rc-meter').style.width = Math.max(4, d.percent) + '%';
    $('rc-summary').textContent = d.report.summary;
    $('rc-pri').innerHTML = d.report.priorities.map(function (p) { return '<li><b>' + esc(p.title) + '</b><span>' + esc(p.why) + '</span></li>'; }).join('');
    $('rc-gaps').innerHTML = d.gaps.length ? d.gaps.map(function (g) { return '<li><b>' + esc(g.answer) + ':</b> ' + esc(g.q) + '</li>'; }).join('') : '<li>No gaps reported.</li>';
    // Pre-fill the full consultation intake (same browser, same 7-day sessionStorage format it uses).
    try {
      var fw = { cmmc: 'CMMC / NIST SP 800-171', hipaa: 'HIPAA', soc2: 'SOC 2', insurance: 'Cyber insurance requirements', aigov: 'ISO/IEC 42001 / EU AI Act' }[track];
      var data = { name: c.name, email: c.email, company: c.company, role: c.role, size: c.size, industry: c.industry, frameworks: fw ? [fw] : [], services: ['Compliance readiness'], source: 'Readiness check' };
      sessionStorage.setItem('nsa-intake', JSON.stringify({ savedAt: Date.now(), data: data }));
    } catch (e) {}
    show(3);
    try { if (window.posthog) window.posthog.capture('readiness_check_completed', { track: track, band: d.band, source: d.source }); } catch (e) {}
  }
  $('rc-restart').addEventListener('click', function () { t0 = Date.now(); show(0); });
})();
