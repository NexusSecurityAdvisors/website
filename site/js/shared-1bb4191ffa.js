(function(){
  var root=document.getElementById('nsa'); if(!root) return;
  root.classList.add('js');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reveal on scroll
  var els=root.querySelectorAll('.rv');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    els.forEach(function(el,i){el.style.transitionDelay=(i%4)*80+'ms';io.observe(el);});
  } else { els.forEach(function(el){el.classList.add('in');}); }
  // stat counters
  var nums=root.querySelectorAll('.stat b[data-c]');
  if(!reduce && 'IntersectionObserver' in window){
    var so=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var b=e.target,end=+b.getAttribute('data-c'),suf=b.textContent.replace(/[0-9]/g,''),t0=null;so.unobserve(b);
      function step(t){if(!t0)t0=t;var p=Math.min((t-t0)/1400,1);b.textContent=Math.round(end*(1-Math.pow(1-p,3)))+suf;if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);})},{threshold:.6});
    nums.forEach(function(n){so.observe(n);});
  }
  // scroll progress, back-to-top, approach line
  var prog=root.querySelector('.prog'),top=root.querySelector('.totop'),steps=root.querySelector('.steps');
  function onScroll(){var d=document.documentElement,max=d.scrollHeight-d.clientHeight,y=window.pageYOffset||d.scrollTop;
    if(prog)prog.style.width=(max>0?y/max*100:0)+'%';if(top)top.classList.toggle('on',y>700);
    if(steps){var r=steps.getBoundingClientRect(),vh=window.innerHeight,p=Math.max(0,Math.min(1,(vh*0.85-r.top)/(r.height+vh*0.35)));steps.style.setProperty('--p',(p*100).toFixed(1)+'%');}}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  // spotlight follow
  root.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.spot');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');});
  // risk matrix
  var mx=document.getElementById('mx'),out=document.getElementById('mxout');
  if(mx){
    var band=function(s){return s>=20?['Critical','b4','#C2384B','7 days']:s>=10?['High','b3','#1F78D6','30 days']:s>=5?['Medium','b2','#1A5596','90 days']:['Low','b1','#2A3544','next review cycle'];};
    var html='';for(var i=5;i>=1;i--){html+='<div class="ax">'+i+'</div>';for(var l=1;l<=5;l++){var s=i*l,b=band(s);html+='<button type="button" class="cell '+b[1]+'" data-l="'+l+'" data-i="'+i+'" aria-label="Likelihood '+l+', impact '+i+', score '+s+', '+b[0]+'">'+s+'</button>';}}
    mx.innerHTML=html;
    mx.addEventListener('click',function(e){var c=e.target.closest('.cell');if(!c)return;mx.querySelectorAll('.sel').forEach(function(n){n.classList.remove('sel')});c.classList.add('sel');
      var l=+c.getAttribute('data-l'),i=+c.getAttribute('data-i'),s=l*i,b=band(s);
      out.innerHTML='<b>Likelihood '+l+' &times; Impact '+i+' = '+s+'</b><span class="lvl" style="--c:'+b[2]+'">'+b[0].toUpperCase()+'</span><br>Example remediation deadline: <b>'+b[3]+'</b>. Each finding also gets a named owner and a retest date.';});
    var def=mx.querySelector('.cell[data-l="4"][data-i="5"]');if(def)def.click();
  }
  // terminal typing
  var tty=document.getElementById('tty');
  if(tty){
    var lines=[['ok','[+] Asset inventory: 412 systems mapped'],['ok','[+] AI usage scan: 37 tools found, 11 unsanctioned'],['wr','[!] Finding: support agent can email CRM records externally'],['cr','    Likelihood 4 x Impact 5 = 20  -> CRITICAL, fix in 7 days'],['ok','[+] Owner assigned: IT Director | retest scheduled'],['ok','[+] 30/60/90-day roadmap ready for leadership']];
    var started=false,full='<span class="pr">$</span> nexus assess --framework nist-csf-2.0 --scope ai-rollout';
    var render=function(n,partial){var h=full;for(var k=0;k<n;k++)h+='\n<span class="'+lines[k][0]+'">'+lines[k][1]+'</span>';if(partial!=null)h+='\n<span class="'+lines[n][0]+'">'+partial+'</span>';tty.innerHTML=h+'<span class="cur"></span>';};
    var play=function(){if(started)return;started=true;var n=0,c=0;(function tick(){if(n>=lines.length){render(n);return;}var t=lines[n][1];c+=2;if(c>=t.length){n++;c=0;render(n);setTimeout(tick,420);}else{render(n,t.slice(0,c));setTimeout(tick,18);}})();};
    var rp=document.getElementById('replay');if(rp)rp.addEventListener('click',function(){started=false;render(0);play();});
    if(reduce||!('IntersectionObserver' in window)){render(lines.length);}else{render(0);new IntersectionObserver(function(es,o){if(es[0].isIntersecting){play();o.disconnect();}},{threshold:.4}).observe(tty);}
  }

  // regulatory tabs
  var tabs=[].slice.call(root.querySelectorAll('.rtab'));
  function sel(t,focus){tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=!on;});if(focus)t.focus();}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){sel(t)});t.addEventListener('keydown',function(e){var k=e.key,n=null;if(k==='ArrowRight')n=tabs[(i+1)%tabs.length];if(k==='ArrowLeft')n=tabs[(i-1+tabs.length)%tabs.length];if(n){e.preventDefault();sel(n,true);}});});
  var hm={'#cra':'t-cra','#cmmc':'t-cmmc','#hipaa':'t-hipaa','#pci':'t-pci','#rmf':'t-rmf'};if(hm[location.hash]){sel(document.getElementById(hm[location.hash]));}
  // RMF stepper
  var rmf=document.getElementById('rmf'),ro=document.getElementById('rmfout');
  if(rmf){var steps2=['<b>Prepare:</b> establish context, roles, risk tolerance, and common controls at the organization and system levels.','<b>Categorize:</b> determine the system\'s impact level based on the information it processes (FIPS 199).','<b>Select:</b> choose and tailor controls from NIST SP 800-53 to fit the risk.','<b>Implement:</b> put the controls in place and document how they are deployed.','<b>Assess:</b> independently verify the controls work as intended and produce an assessment report.','<b>Authorize:</b> a senior official accepts the residual risk and grants authority to operate (ATO).','<b>Monitor:</b> continuously track controls, changes, and threats; report and respond over time.'];
    rmf.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;rmf.querySelectorAll('.on').forEach(function(x){x.classList.remove('on')});b.classList.add('on');ro.innerHTML=steps2[+b.getAttribute('data-i')];});
    rmf.querySelector('button').click();}

  // approach details
  var APD=[
   {o:'Establish an evidence-based baseline of your current security posture and define a realistic target.',a:['Stakeholder interviews across leadership, IT, operations, and finance','Asset, data, and third-party inventory, including where sensitive data and AI tools live','Control review mapped to NIST CSF 2.0 functions: Govern, Identify, Protect, Detect, Respond, Recover','Gap analysis against your required frameworks (CMMC, HIPAA, SOC 2, PCI DSS, CRA)'],d:['Current-state and target CSF profiles','Asset and data-flow inventory','Framework gap matrix'],t:'2 to 4 weeks',s:['NIST CSF 2.0','NIST SP 800-30','CIS Controls v8.1']},
   {o:'Turn findings into a ranked, defensible list so leadership funds the right work first.',a:['Score each risk on a consistent 5&times;5 likelihood-by-impact scale','Tie each risk to business impact: revenue, contracts, safety, regulatory exposure','Quantify top risks in financial terms where useful (Open FAIR)','Agree on risk appetite and treatment options: mitigate, transfer, avoid, accept with evidence'],d:['Risk register with owners','Heat map and top-10 risk briefing','Treatment plan with cost estimates'],t:'1 to 2 weeks',s:['NIST SP 800-30','ISO 31000','ISO/IEC 27005','Open FAIR']},
   {o:'Close the most important gaps quickly, with clear ownership and accountability.',a:['Build a 30/60/90-day roadmap with named owners and due dates','Write or update core policies, incident response plan, and vendor requirements','Work alongside your IT team or MSP to implement and verify controls','Track every finding to closure with evidence and a retest date'],d:['30/60/90-day roadmap','Policy set and IR plan','Remediation tracker with evidence'],t:'30 to 90 days, then ongoing',s:['NIST SP 800-53','NIST SP 800-61 Rev. 3','CIS Controls v8.1']},
   {o:'Show measurable risk reduction to leadership, boards, customers, and auditors.',a:['Select a small set of meaningful measures and trend them over time','Retest closed findings and update residual risk','Brief leadership and the board in plain business language','Prepare evidence packages for audits, assessments, and customer reviews'],d:['Quarterly board scorecard','Updated risk register and profile','Audit-ready evidence package'],t:'Monthly and quarterly cadence',s:['NIST SP 800-55','NIST CSF 2.0 Govern','SEC / board oversight practices']}];
  var sb=[].slice.call(root.querySelectorAll('.stepbtn')),apd=document.getElementById('apd');
  function showStep(k){var x=APD[k];sb.forEach(function(b,j){var on=j===k;b.setAttribute('aria-expanded',on);b.parentNode.classList.toggle('on',on);});
    apd.innerHTML='<div class="full"><h4>Step '+(k+1)+' objective</h4><p style="margin:0;color:var(--text);font-size:16px">'+x.o+'</p></div>'+
     '<div><h4>Key activities</h4><ul>'+x.a.map(function(v){return '<li>'+v+'</li>'}).join('')+'</ul></div>'+
     '<div><h4>Deliverables</h4><ul>'+x.d.map(function(v){return '<li>'+v+'</li>'}).join('')+'</ul></div>'+
     '<div><h4>Typical timeframe</h4><p style="margin:0 0 14px">'+x.t+'</p><h4>Standards &amp; methods</h4><div class="meta2">'+x.s.map(function(v){return '<span class="chip">'+v+'</span>'}).join('')+'</div></div>';}
  sb.forEach(function(b,k){b.addEventListener('click',function(){showStep(k)})});if(apd)showStep(0);
  // regulatory tab deep links from Who We Serve
  root.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-tab]');if(!a)return;var t=document.getElementById(a.getAttribute('data-tab'));if(t)t.click();});
  // scenario simulator
  var SC={ransom:{n:'Ransomware',l:4,i:5,d:'Attackers encrypt systems and steal data for extortion.',c:[['MFA on email, remote access, and admins',1,0],['EDR on all endpoints with 24/7 monitoring',1,0],['Immutable, tested offline backups',0,2],['Network segmentation',0,1],['Tested incident response plan',0,1]]},
   bec:{n:'Business email compromise',l:5,i:4,d:'A spoofed or hijacked mailbox tricks staff into wiring funds or sharing data.',c:[['Phishing-resistant MFA',2,0],['DMARC enforcement and email filtering',1,0],['Out-of-band payment verification',0,2],['Security awareness and reporting',1,0]]},
   ai:{n:'Shadow AI data leak',l:4,i:4,d:'Employees paste sensitive data into unapproved AI tools, or an agent has excessive permissions.',c:[['AI acceptable-use policy and training',1,0],['Approved, enterprise AI tools with data controls',1,1],['Least-privilege agent identities',1,1],['Data loss prevention on prompts and uploads',1,0],['Human approval for outbound agent actions',0,1]]},
   vendor:{n:'Vendor / MSP compromise',l:3,i:5,d:'A trusted provider with access to your network is breached and used to reach you.',c:[['Vendor risk reviews and contract clauses',1,0],['Separate, MFA-protected vendor accounts',1,0],['Least privilege and just-in-time access',0,1],['Monitoring of vendor sessions',1,0],['Tested incident response plan',0,1]]},
   edge:{n:'Exploited edge device',l:4,i:4,d:'An unpatched VPN, firewall, or remote access appliance is exploited from the internet.',c:[['Patch known exploited vulnerabilities fast (CISA KEV)',2,0],['Attack surface inventory and scanning',1,0],['MFA on all remote access',1,0],['Segmentation behind edge devices',0,1]]}};
  var band2=function(s){return s>=20?['Critical','#C2384B','fix within 7 days']:s>=10?['High','#1F78D6','fix within 30 days']:s>=5?['Medium','#1A5596','fix within 90 days']:['Low','#2A3544','track at next review']};
  var scns=document.getElementById('scns'),ctrls=document.getElementById('ctrls'),mini=document.getElementById('mini'),curS='ransom';var ST={};window.NexusRiskLab={SC:SC,ST:ST,band:band2};
  if(scns){
    scns.innerHTML=Object.keys(SC).map(function(k){return '<button type="button" class="scn" role="tab" data-k="'+k+'" aria-selected="false">'+SC[k].n+'</button>'}).join('');
    var mh='';for(var ii=5;ii>=1;ii--)for(var ll=1;ll<=5;ll++){var bb=band2(ii*ll);mh+='<i data-l="'+ll+'" data-i="'+ii+'" style="--c:'+bb[1]+'"></i>';}mini.innerHTML=mh;
    var calc=function(){var s=SC[curS],L=s.l,I=s.i,on=[],off=[];ST[curS]=[];[].forEach.call(ctrls.querySelectorAll('input'),function(x,j){var c=s.c[j];ST[curS][j]=!!x.checked;if(x.checked){L-=c[1];I-=c[2];on.push(c[0])}else off.push(c);});
      L=Math.max(1,L);I=Math.max(1,I);var inh=s.l*s.i,res=L*I,bi=band2(inh),br=band2(res);
      document.getElementById('g-in').textContent=inh;document.getElementById('g-re').textContent=res;
      var gi=document.getElementById('gb-in'),gr=document.getElementById('gb-re');gi.style.width=(inh/25*100)+'%';gi.style.background=bi[1];gr.style.width=(res/25*100)+'%';gr.style.background=br[1];
      var best=off.slice().sort(function(a,b){return (b[1]+b[2])-(a[1]+a[2])})[0];
      document.getElementById('simres').innerHTML='<b>'+s.n+':</b> '+s.d+'<br>Residual: likelihood '+L+' &times; impact '+I+' = <b>'+res+'</b> <span class="lvl" style="--c:'+br[1]+'">'+br[0].toUpperCase()+'</span> &mdash; '+br[2]+'.'+
        (best?'<br>Biggest next move: <b>'+best[0]+'</b>.':'<br>All modeled controls in place. Validate them with testing and evidence.');
      [].forEach.call(mini.children,function(c){var l=+c.getAttribute('data-l'),i2=+c.getAttribute('data-i');c.className=(l===L&&i2===I)?'re':((l===s.l&&i2===s.i)?'in':'');});try{document.dispatchEvent(new CustomEvent('nexus-risk-update'));}catch(e){}};
    var pickS=function(k){curS=k;[].forEach.call(scns.children,function(b){b.setAttribute('aria-selected',b.getAttribute('data-k')===k)});
      ctrls.innerHTML=SC[k].c.map(function(c,j){var eff=(c[1]?'&minus;'+c[1]+' likelihood':'')+(c[1]&&c[2]?', ':'')+(c[2]?'&minus;'+c[2]+' impact':'');return '<label class="ctrl"><input type="checkbox" role="switch" data-j="'+j+'"'+(ST[k]&&ST[k][j]?' checked':'')+'><div><b>'+c[0]+'</b><span>'+eff+'</span></div></label>'}).join('');calc();};
    scns.addEventListener('click',function(e){var b=e.target.closest('.scn');if(b)pickS(b.getAttribute('data-k'));});
    ctrls.addEventListener('change',calc);
    root.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-scn]');if(!t)return;var k=t.getAttribute('data-scn');if(!SC[k])return;pickS(k);if(t.tagName==='BUTTON'){var sim=document.getElementById('sim');sim.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}});
    var hs=((location.hash||'').match(/^#lab-([a-z]+)$/)||[])[1];pickS(SC[hs]?hs:'ransom');if(SC[hs]){var lb=document.getElementById('lab');if(lb)setTimeout(function(){lb.scrollIntoView({block:'start'})},60);}
  }
  // network canvas
  var c=document.getElementById('net'); if(!c||!c.getContext) return;
  var x=c.getContext('2d'),W,H,pts=[],dpr=Math.min(window.devicePixelRatio||1,2),mouse={x:-999,y:-999},run=true;
  function size(){var r=c.getBoundingClientRect();W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
    var n=Math.round(Math.min(130,Math.max(45,W*H/8500)));pts=[];for(var i=0;i<n;i++){pts.push({x:W*(.25+Math.random()*.75),y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.6+.6});}}
  function draw(){x.clearRect(0,0,W,H);var max=150;
    for(var i=0;i<pts.length;i++){var p=pts[i];
      if(!reduce){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;}
      for(var j=i+1;j<pts.length;j++){var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<max){x.strokeStyle='rgba(43,155,244,'+(0.7*(1-d/max)).toFixed(3)+')';x.lineWidth=.7;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke();}}
      var md=Math.hypot(p.x-mouse.x,p.y-mouse.y);
      if(md<160){x.strokeStyle='rgba(201,204,207,'+(0.5*(1-md/160)).toFixed(3)+')';x.beginPath();x.moveTo(p.x,p.y);x.lineTo(mouse.x,mouse.y);x.stroke();}
      x.fillStyle='rgba(220,236,255,.9)';x.shadowColor='#2B9BF4';x.shadowBlur=8;x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill();x.shadowBlur=0;}
    if(run&&!reduce)requestAnimationFrame(draw);}
  size();draw();
  window.addEventListener('resize',function(){size();if(reduce)draw();});
  var hero=c.parentNode;
  hero.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
  hero.addEventListener('mouseleave',function(){mouse.x=mouse.y=-999;});
  if('IntersectionObserver' in window){new IntersectionObserver(function(es){var v=es[0].isIntersecting;if(v&&!run){run=true;if(!reduce)requestAnimationFrame(draw);}run=v;}).observe(hero);}
})();
