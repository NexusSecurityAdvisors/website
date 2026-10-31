/* Nexus Security Advisors: personal & mixed-use security tools.
   Runs entirely in the browser. Nothing is sent or stored. */
(function () {
  'use strict';

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------- Self-assessment ---------------- */
  var form = document.getElementById('qz');
  var out = document.getElementById('qres');
  if (form && out) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var sets = form.querySelectorAll('fieldset');
      var max = 0, got = 0, unanswered = 0, fixes = [];
      sets.forEach(function (fs) {
        var w = parseInt(fs.getAttribute('data-w'), 10) || 1;
        var pick = fs.querySelector('input:checked');
        max += w;
        if (!pick) { unanswered++; fixes.push({ w: w, t: fs.getAttribute('data-fix') }); return; }
        if (pick.value === 'y') got += w;
        else fixes.push({ w: w, t: fs.getAttribute('data-fix') });
      });
      var pct = Math.round((got / max) * 100);
      var lvl = pct >= 80 ? 'low' : pct >= 50 ? 'mid' : 'high';
      var label = { low: 'Lower risk: good habits in place', mid: 'Moderate risk: a few important gaps', high: 'Higher risk: start with the fixes below' }[lvl];
      fixes.sort(function (a, b) { return b.w - a.w; });

      out.textContent = '';
      out.className = 'qres lvl-' + lvl;
      out.appendChild(el('div', { 'class': 'sc' }, 'Score: ' + pct + ' / 100'));
      out.appendChild(el('p', null, label + (unanswered ? ' (' + unanswered + ' unanswered, counted as gaps).' : '.')));
      if (fixes.length) {
        out.appendChild(el('p', null, 'Your top fixes, most important first:'));
        var ol = el('ol', { 'class': 'fs' });
        fixes.slice(0, 5).forEach(function (f) { ol.appendChild(el('li', null, f.t)); });
        out.appendChild(ol);
      }
      out.hidden = false;
      out.setAttribute('tabindex', '-1');
      out.focus();
    });
    form.addEventListener('reset', function () { out.hidden = true; out.textContent = ''; });
  }

  /* ---------------- Accounts-to-secure worksheet ---------------- */
  var tbl = document.getElementById('inv');
  if (!tbl) return;
  var body = tbl.querySelector('tbody');
  var COLS = [
    { k: 'acct', type: 'text', label: 'Account or service', ph: 'e.g. Work email' },
    { k: 'use', type: 'select', label: 'Used for', opts: ['Business', 'Personal', 'Both'] },
    { k: 'mfa', type: 'select', label: 'MFA type', opts: ['None', 'Text message', 'Authenticator app', 'Passkey or security key', 'Not sure'] },
    { k: 'pm', type: 'select', label: 'In password manager?', opts: ['No', 'Yes'] },
    { k: 'rec', type: 'select', label: 'Recovery email / phone current?', opts: ['Not checked', 'Yes', 'No'] },
    { k: 'notes', type: 'text', label: 'Notes', ph: 'Next step' }
  ];
  var STARTERS = ['Work email', 'Personal email', 'Bank / payments', 'Payroll', 'Phone carrier', 'Domain registrar', 'Cloud storage', 'Password manager'];

  function addRow(name) {
    var tr = el('tr');
    COLS.forEach(function (c) {
      var td = el('td'), f;
      if (c.type === 'select') {
        f = el('select', { 'aria-label': c.label });
        c.opts.forEach(function (o) { f.appendChild(el('option', { value: o }, o)); });
      } else {
        f = el('input', { type: 'text', maxlength: '120', 'aria-label': c.label, placeholder: c.ph || '', autocomplete: 'off' });
        if (c.k === 'acct' && name) f.value = name;
      }
      f.setAttribute('data-k', c.k);
      td.appendChild(f);
      tr.appendChild(td);
    });
    var tdx = el('td');
    var rm = el('button', { type: 'button', 'class': 'rm', 'aria-label': 'Remove this row' }, '×');
    rm.addEventListener('click', function () { tr.remove(); });
    tdx.appendChild(rm);
    tr.appendChild(tdx);
    body.appendChild(tr);
    return tr;
  }
  STARTERS.forEach(addRow);

  document.getElementById('inv-add').addEventListener('click', function () {
    var tr = addRow('');
    tr.querySelector('input').focus();
  });

  /* CSV with protection against spreadsheet formula injection */
  function cell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }
  document.getElementById('inv-csv').addEventListener('click', function () {
    var lines = [COLS.map(function (c) { return cell(c.label); }).join(',')];
    body.querySelectorAll('tr').forEach(function (tr) {
      lines.push(COLS.map(function (c) { return cell(tr.querySelector('[data-k="' + c.k + '"]').value); }).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var u = URL.createObjectURL(blob);
    var a = el('a', { href: u, download: 'accounts-to-secure.csv' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 500);
  });
  document.getElementById('inv-print').addEventListener('click', function () { window.print(); });
})();
