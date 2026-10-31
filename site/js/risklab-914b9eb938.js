(function(){
 var R=window.NexusRiskLab; if(!R||!document.getElementById('rlreport'))return;
 var SC=R.SC,ST=R.ST,band=R.band;
 var OWN={ransom:'IT lead or managed service provider (MSP)',bec:'Finance lead with IT',ai:'AI governance lead',vendor:'Operations lead with IT',edge:'IT lead or MSP'};
 var COLOR={Critical:'#FF6B7A',High:'#5B9BE8',Medium:'#A7AEB8',Low:'#7C8794'};
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function val(id){var e=document.getElementById(id);return e?e.value.trim():'';}
 function score(k){var s=SC[k],L=s.l,I=s.i,on=[],off=[],st=ST[k]||[];
  s.c.forEach(function(c,j){if(st[j]){L-=c[1];I-=c[2];on.push(c[0]);}else off.push(c);});
  L=Math.max(1,L);I=Math.max(1,I);off.sort(function(a,b){return (b[1]+b[2])-(a[1]+a[2]);});
  var inh=s.l*s.i,res=L*I,b=band(res);
  return {k:k,n:s.n,d:s.d,l0:s.l,i0:s.i,inh:inh,L:L,I:I,res:res,rating:b[0],deadline:b[2],on:on,off:off,red:inh?Math.round((inh-res)/inh*100):0,touched:!!ST[k]};}
 function all(){return Object.keys(SC).map(score).sort(function(a,b){return b.res-a.res;});}
 function radar(){var ul=document.getElementById('rlist');if(!ul)return;var rows=all();
  ul.innerHTML=rows.map(function(r){return '<li><button type="button" class="rl" data-scn="'+r.k+'">'+esc(r.n)+'</button><b style="color:'+COLOR[r.rating]+'">'+r.rating.toUpperCase()+' &middot; '+r.res+'</b></li>';}).join('');
  var sum=document.getElementById('rlsum');
  if(sum){var crit=rows.filter(function(r){return r.rating==='Critical';}).length,high=rows.filter(function(r){return r.rating==='High';}).length,tot=rows.reduce(function(a,r){return a+r.res;},0),max=rows.reduce(function(a,r){return a+r.inh;},0);
   sum.textContent='Current results: '+crit+' critical and '+high+' high risks across '+rows.length+' scenarios. Total residual risk is '+tot+' of '+max+' possible ('+Math.round((max-tot)/max*100)+'% reduction from controls selected).';}}
 function reportHTML(){
  var org=val('rl_org')||'Your organization',ind=val('rl_ind')||'Not specified',size=val('rl_size')||'Not specified',by=val('rl_by')||'',d=new Date(),ds=d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  var rows=all(),top=[];rows.forEach(function(r){r.off.slice(0,2).forEach(function(c){top.push({risk:r.n,ctrl:c[0],gain:c[1]+c[2],rating:r.rating});});});
  top.sort(function(a,b){var o={Critical:3,High:2,Medium:1,Low:0};return (o[b.rating]-o[a.rating])||(b.gain-a.gain);});top=top.slice(0,5);
  var crit=rows.filter(function(r){return r.rating==='Critical';}).length,high=rows.filter(function(r){return r.rating==='High';}).length;
  var css='body{font-family:Arial,Helvetica,sans-serif;color:#1B2430;max-width:900px;margin:0 auto;padding:32px;line-height:1.5}h1{color:#0E1B2E;margin:0 0 4px}h2{color:#1A6FD1;border-bottom:2px solid #2B9BF4;padding-bottom:4px;margin-top:30px}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}th{background:#152A45;color:#fff;text-align:left;padding:8px}td{border:1px solid #C9CCCF;padding:8px;vertical-align:top}.hdr{background:#0E1B2E;color:#fff;padding:18px 22px;border-radius:8px;margin-bottom:20px}.hdr p{margin:4px 0;color:#C9CCCF}.pill{display:inline-block;padding:2px 8px;border-radius:4px;color:#fff;font-weight:bold;font-size:12px}.box{background:#EEF4FB;border-left:4px solid #2B9BF4;padding:12px 16px;margin:12px 0}.sig td{height:34px}.small{font-size:12px;color:#5B6573}@media print{body{padding:0}.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}th,.pill{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  var pc={Critical:'#C2384B',High:'#1F78D6',Medium:'#1A5596',Low:'#5B6573'};
  var h='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Cyber Risk Summary - '+esc(org)+'</title><style>'+css+'</style></head><body>';
  h+='<div class="hdr"><h1 style="color:#fff">Cyber Risk Summary for Leadership</h1><p><b>'+esc(org)+'</b> &middot; '+esc(ind)+' &middot; '+esc(size)+'</p><p>Prepared '+ds+(by?' by '+esc(by):'')+' using the Nexus Security Advisors Risk Lab</p></div>';
  h+='<h2>1. Executive summary</h2><p>This summary scores five common cyber threats to small and mid-sized organizations on a 5&times;5 scale (likelihood &times; impact, 1 to 25), before controls (<b>inherent risk</b>) and after the controls currently in place (<b>residual risk</b>).</p>';
  h+='<div class="box"><b>Bottom line:</b> '+crit+' critical and '+high+' high residual risks. The top priority is <b>'+esc(rows[0].n)+'</b> (residual '+rows[0].res+', '+rows[0].rating.toLowerCase()+'): '+esc(rows[0].deadline)+'.</div>';
  h+='<h2>2. Risk register</h2><table><tr><th>Risk</th><th>Inherent</th><th>Residual</th><th>Rating</th><th>Suggested deadline</th><th>Suggested owner</th></tr>';
  rows.forEach(function(r){h+='<tr><td><b>'+esc(r.n)+'</b><br><span class="small">'+esc(r.d)+'</span></td><td>'+r.inh+' ('+r.l0+'&times;'+r.i0+')</td><td>'+r.res+' ('+r.L+'&times;'+r.I+')</td><td><span class="pill" style="background:'+pc[r.rating]+'">'+r.rating+'</span></td><td>'+esc(r.deadline)+'</td><td>'+esc(OWN[r.k])+'</td></tr>';});
  h+='</table><h2>3. Top recommended actions</h2><table><tr><th>#</th><th>Action</th><th>Reduces</th><th>Priority</th></tr>';
  top.forEach(function(t,i){h+='<tr><td>'+(i+1)+'</td><td>'+esc(t.ctrl)+'</td><td>'+esc(t.risk)+'</td><td>'+t.rating+'</td></tr>';});
  if(!top.length)h+='<tr><td colspan="4">All modeled controls are in place. Next step: validate them with testing and evidence.</td></tr>';
  h+='</table><h2>4. Details by risk</h2>';
  rows.forEach(function(r){h+='<h3>'+esc(r.n)+' &mdash; residual '+r.res+' ('+r.rating+'), '+r.red+'% lower than inherent</h3><p><b>Controls in place:</b> '+(r.on.length?r.on.map(esc).join('; '):'None selected')+'</p><p><b>Gaps, in order of impact:</b> '+(r.off.length?r.off.map(function(c){return esc(c[0]);}).join('; '):'None of the modeled controls are missing')+'</p>';});
  h+='<h2>5. Decisions requested from leadership</h2><ol><li>Approve the owners and deadlines in the risk register.</li><li>Fund the top recommended actions or formally accept the remaining risk.</li><li>Schedule a tabletop exercise to test incident response (free kit: nexussecurityadvisors.com/tabletop).</li><li>Review progress at the next leadership meeting.</li></ol>';
  h+='<table class="sig"><tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr><tr><td>Prepared by</td><td>'+esc(by)+'</td><td></td><td></td></tr><tr><td>Reviewed by (executive)</td><td></td><td></td><td></td></tr><tr><td>Risk acceptance (if any)</td><td></td><td></td><td></td></tr></table>';
  h+='<h2>6. Method and limits</h2><p class="small">Scores use a simplified model: each control lowers likelihood or impact by a fixed amount. Ratings: Critical 20&ndash;25 (fix within 7 days), High 10&ndash;19 (30 days), Medium 5&ndash;9 (90 days), Low 1&ndash;4 (track at next review). This is an illustrative self-assessment for discussion, not an audit or professional opinion. A full assessment uses your environment, evidence, and current threat intelligence, mapped to the NIST Cybersecurity Framework 2.0.</p>';
  h+='<p class="small">Generated in your browser by the Nexus Security Advisors Risk Lab. No information was sent to Nexus. Questions: info@nexussecurityadvisors.com &middot; nexussecurityadvisors.com</p></body></html>';
  return h;}
 function csv(){var rows=all(),q=function(s){return '"'+String(s).replace(/"/g,'""')+'"';};
  var out=['Risk,Inherent,Residual,Likelihood,Impact,Rating,Deadline,Owner,Controls in place,Gaps'];
  rows.forEach(function(r){out.push([q(r.n),r.inh,r.res,r.L,r.I,r.rating,q(r.deadline),q(OWN[r.k]),q(r.on.join('; ')),q(r.off.map(function(c){return c[0];}).join('; '))].join(','));});return out.join('\r\n');}
 function dl(name,type,data){var b=new Blob([data],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove();},500);}
 function slug(){return (val('rl_org')||'organization').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'organization';}
 document.getElementById('rl_html').addEventListener('click',function(){dl('cyber-risk-summary-'+slug()+'.html','text/html',reportHTML());});
 document.getElementById('rl_csv').addEventListener('click',function(){dl('cyber-risk-register-'+slug()+'.csv','text/csv',csv());});
 document.getElementById('rl_print').addEventListener('click',function(){var w=window.open('','_blank');if(!w){dl('cyber-risk-summary-'+slug()+'.html','text/html',reportHTML());return;}w.document.open();w.document.write(reportHTML());w.document.close();setTimeout(function(){try{w.focus();w.print();}catch(e){}},400);});
 document.addEventListener('nexus-risk-update',radar);radar();
})();
