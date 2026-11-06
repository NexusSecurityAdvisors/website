(function(){
 var root=document.getElementById('nsa');if(!root)return;root.classList.add('js');
 var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var prog=root.querySelector('.prog'),top=root.querySelector('.totop');
 function onScroll(){var d=document.documentElement,max=d.scrollHeight-d.clientHeight,y=window.pageYOffset||d.scrollTop;if(prog)prog.style.width=(max>0?y/max*100:0)+'%';if(top)top.classList.toggle('on',y>700);}
 window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 root.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.spot');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');});

 var f=document.getElementById('intake'),err=document.getElementById('err'),ok=document.getElementById('ok'),KEY='nsa-intake';
 var TTL=7*864e5,store={get:function(){try{var o=JSON.parse(sessionStorage.getItem(KEY)||'null');if(!o||!o.savedAt||!o.data||Date.now()-o.savedAt>TTL){sessionStorage.removeItem(KEY);return null}return o.data}catch(e){return null}},set:function(v){try{sessionStorage.setItem(KEY,JSON.stringify({savedAt:Date.now(),data:v}))}catch(e){}}};
 function val(){var o={};[].forEach.call(f.elements,function(el){if(!el.name||el.name==='company_url_confirm')return;if(el.type==='checkbox'){o[el.name]=o[el.name]||[];if(el.checked)o[el.name].push(el.value);}else o[el.name]=el.value.trim();});return o;}
 function restore(){var o=store.get();if(!o)return;[].forEach.call(f.elements,function(el){if(!el.name||!(el.name in o)||el.type==='checkbox')return;el.value=o[el.name];});}
 f.addEventListener('input',function(){store.set(val())});
 function check(){var o=val();var need=['name','email','company','goal'];
   for(var k=0;k<need.length;k++){if(!o[need[k]])return 'Please complete the required fields (*).';}
   if(o.email.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email))return 'Please enter a valid email address.';return '';}
 function AT(){var a=null;try{a=window.nsaAttribution&&window.nsaAttribution()}catch(e){}a=a||{};a.first=a.first||{};return a;}
 function TF(x){return x&&x.src?String(x.src)+' / '+(x.med||'-')+(x.cmp?' / '+x.cmp:'')+(x.land?', landed on '+x.land:'')+(x.ts?' ('+x.ts+')':''):'-'}
 function summary(){var o=val();return ['NEXUS SECURITY ADVISORS: CLIENT INTAKE','Submitted: '+new Date().toLocaleString(),'',
  'CONTACT','  Name: '+o.name,'  Email: '+o.email,'  Company: '+o.company,'','HOW CAN WE HELP','  '+o.goal,'',
  'HOW YOU FOUND US (recorded automatically)','  First visit: '+TF(AT().first),'  Latest visit: '+TF(AT().last),'','CONSENT','  Agreed to privacy notice and to be contacted: '+(document.getElementById('f-consent').checked?'yes ('+new Date().toISOString()+')':'not yet'),'',
  'Follow-up details (industry, size, frameworks, timing, budget) are collected on the discovery call.'].join('\n');}
 try{(window.__nsaq=window.__nsaq||[]).push(['intake_step_viewed',{step:1,steps:1}])}catch(e){}
 f.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'){e.preventDefault();}});

 var T0=Date.now();
 var GS_TS_SITEKEY='0x4AAAAAAF0PKlsgoUMRf2Nh',gsTsId=null;
 function gsTsMount(){var el=document.getElementById('gs-ts');if(!el||gsTsId!==null||!window.turnstile||f.querySelector('.st').hidden)return;gsTsId=window.turnstile.render(el,{sitekey:GS_TS_SITEKEY,action:'intake'});}
 function gsTsToken(){return(window.turnstile&&gsTsId!==null&&window.turnstile.getResponse(gsTsId))||'';}
 function gsTsReset(){if(window.turnstile&&gsTsId!==null)window.turnstile.reset(gsTsId);}
 window.gsTsReady=gsTsMount;
 function split(n){n=(n||'').trim().replace(/\s+/g,' ');var p=n.split(' ');if(p.length<2)return {f:'',l:n};var P=/^(de|da|di|do|dos|das|del|della|der|den|du|la|le|van|von|bin|ibn|al|el|st\.?|mac|mc|ten|ter)$/i,k=p.length-1;while(k>1&&P.test(p[k-1]))k--;return {f:p.slice(0,k).join(' '),l:p.slice(k).join(' ')};}
 function clip(v,m){v=String(v||'');return v.length>m?v.slice(0,m):v;}
 function neut(v){v=String(v||'').trim();return /^[=+\-@\t\r]/.test(v)?"'"+v:v;}
 function nsaMap(o){var N=function(s){return String(s||'').replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();};var one=function(v,t){return v?(t[N(v)]||''):'';};var many=function(a,t){var r=[];[].concat(a||[]).forEach(function(x){var m=t[N(x)];if(m&&r.indexOf(m)<0)r.push(m);});return r;};var SIZE={'1-10':'1-10','11-50':'11-50','51-200':'51-200','201-500':'201-500','501-1,000':'501-1,000','1,000+':'1,000+'};var IND={'aerospace & defense':'Aerospace & Defense (DIB)','healthcare':'Healthcare','financial services':'Financial Services','manufacturing':'Manufacturing','energy & utilities':'Critical Infrastructure / Utilities','saas / technology':'Technology / SaaS','professional services (legal, accounting)':'Legal / Professional Services','education / research':'Education','government contractor':'Other','nonprofit':'Other','retail / e-commerce':'Other','other':'Other'};var STAFF={'no dedicated it or security staff':'No dedicated security staff','it staff, no security specialist':'IT handles security part-time','managed service provider (msp)':'Outsourced to MSP/MSSP','some security staff':'1-2 security staff','a security team without a ciso':'Security team, no CISO','a ciso or security leader today':'Have a CISO / security leader'};var SVC={'fractional / virtual ciso':'Fractional vCISO','security posture assessment & roadmap':'Security Posture Assessment','compliance readiness':'Compliance Readiness','ai governance & security':'AI Governance','incident response plan & tabletop exercise':'Incident Response Planning','not sure yet: help me decide':'Not Sure - Need Guidance'};var FW={'cmmc / nist sp 800-171':'CMMC / NIST 800-171','hipaa':'HIPAA','soc 2':'SOC 2','pci dss':'PCI DSS','iso/iec 27001':'ISO 27001','iso/iec 42001 / eu ai act':'AI Governance (NIST AI RMF / ISO 42001 / EU AI Act)','nist csf 2.0':'NIST CSF','cyber insurance requirements':'Cyber-Insurance Requirements','none / not sure':'Not Sure'};var TL={'as soon as possible':'Immediate (within 30 days)','within 30 days':'Immediate (within 30 days)','within 90 days':'1-3 months','this year':'3-6 months','just exploring':'6+ months / exploring'};var BUD={'under $2,500 / month':'Under $2,500 / month','$2,500 - $5,000 / month':'$2,500 – $5,000 / month','$5,000 - $10,000 / month':'$5,000 – $10,000 / month','over $10,000 / month':'Over $10,000 / month','project-based / one-time':'Project-based / one-time','not sure yet':'Not yet defined'};var TRG={'customer or prime contractor questionnaire':'Customer or prime contract requirement','upcoming audit or assessment':'Upcoming audit / assessment','cyber insurance application or renewal':'Cyber-insurance application / renewal','recent incident or near miss':'Recent incident or breach','rolling out ai tools or agents':'AI adoption / AI risk','board, investor, or acquirer request':'Board / investor request','growth / new market or contract':'Growth / new market','security has no clear owner':'Other'};var src=N(o.source),heard=!src?'':/linkedin/.test(src)?'LinkedIn':/forbes/.test(src)?'Forbes Technology Council':/owasp/.test(src)?'OWASP':/podcast|webinar/.test(src)?'Podcast / Webinar':/conference|event|talk|summit/.test(src)?'Conference / Event':/refer|friend|colleague/.test(src)?'Referral':/google|search|bing/.test(src)?'Google / Search':'Other';var q=new URLSearchParams(location.search),u=function(k){try{var x=q.get(k)||sessionStorage.getItem('nsa_'+k)||'';if(x)sessionStorage.setItem('nsa_'+k,x);return x.slice(0,100);}catch(e){return '';}};var svc=many(o.services,SVC);if(!svc.length)svc=['Not Sure - Need Guidance'];var r={LEADCF7:one(o.size,SIZE),Industry:one(o.industry,IND),LEADCF2:svc,LEADCF8:one(o.team,STAFF),LEADCF1:many(o.frameworks,FW),LEADCF9:one(o.timeline,TL),LEADCF10:one(o.budget,BUD),LEADCF11:many(o.triggers,TRG)[0]||'',LEADCF12:heard,LEADCF3:u('utm_source')||AT().first.src||'',LEADCF4:u('utm_medium')||AT().first.med||'',LEADCF5:u('utm_campaign')||AT().first.cmp||'',LEADCF51:'on','Lead Status':'New Inquiry'};Object.keys(r).forEach(function(k){if(r[k]===''||(Array.isArray(r[k])&&!r[k].length))delete r[k];});return r;}
document.getElementById('b-send').addEventListener('click',function(){
   var m=check();if(m){ok.textContent='';err.textContent=m;return;}
   if(!document.getElementById('f-consent').checked){ok.textContent='';err.textContent='Please check the consent box to send your request.';return;}
   err.textContent='';var hpv=document.getElementById('f-hp').value;if(hpv){return;}
   var o=val(),nm=split(o.name);
   var data={'First Name':clip(neut(nm.f),40),'Last Name':clip(neut(nm.l||o.name),80),Email:clip(o.email,100),Company:clip(neut(o.company),200),LEADCF6:clip(summary(),30000)};
   Object.assign(data,nsaMap(o));
   var tok=gsTsToken();if(!tok){ok.textContent='';err.textContent='Please complete the security check just above the Send button.';return;}
   var btn=this;btn.disabled=true;btn.textContent='Sending…';
   fetch('/api/intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fields:data,consent:true,hp:hpv,elapsed:Date.now()-T0,'cf-turnstile-response':tok})})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(d){return {ok:r.ok&&d&&d.ok===true,d:d};});})
    .then(function(x){if(!x.ok)throw x.d;try{sessionStorage.setItem('nsa-intake-pending','1')}catch(e){}location.href='/get-started?submitted=1';})
    .catch(function(d){gsTsReset();btn.disabled=false;btn.textContent='Send my request →';ok.textContent='';err.textContent=(d&&d.message)||'We couldn’t send your request. Please try again, or email info@nexussecurityadvisors.com.';});});
 var pend=null;try{pend=sessionStorage.getItem('nsa-intake-pending')}catch(e){}
 window.addEventListener('pageshow',function(e){if(e.persisted){var bs=document.getElementById('b-send');bs.disabled=false;bs.textContent='Send my request →';}});
 if(/[?&]submitted=1(&|$)/.test(location.search)&&pend){try{sessionStorage.removeItem(KEY);sessionStorage.removeItem('nsa-intake-pending')}catch(e){}
   f.querySelector('.st').hidden=true;var sn=document.getElementById('sent');sn.hidden=false;try{(window.__nsaq=window.__nsaq||[]).push(['intake_submitted'])}catch(e){}
   try{history.replaceState(null,'',location.pathname)}catch(e){}setTimeout(function(){sn.focus()},50);}
 else{if(/[?&]submitted=1/.test(location.search)){try{history.replaceState(null,'',location.pathname)}catch(e){}}restore();}

 var c=document.getElementById('net');if(c&&c.getContext){
 var x=c.getContext('2d'),W,H,pts=[],dpr=Math.min(window.devicePixelRatio||1,2),run=true;
 function size(){var r=c.getBoundingClientRect();W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);var n=Math.round(Math.min(90,Math.max(30,W*H/9000)));pts=[];for(var i=0;i<n;i++)pts.push({x:W*(.3+Math.random()*.7),y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.6});}
 function draw(){x.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){var p=pts[i];if(!reduce){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;}
  for(var j=i+1;j<pts.length;j++){var q2=pts[j],d=Math.hypot(p.x-q2.x,p.y-q2.y);if(d<140){x.strokeStyle='rgba(43,155,244,'+(0.6*(1-d/140)).toFixed(3)+')';x.lineWidth=.7;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q2.x,q2.y);x.stroke();}}
  x.fillStyle='rgba(220,236,255,.9)';x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill();}
  if(run&&!reduce)requestAnimationFrame(draw);}
 c.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:.7';size();draw();window.addEventListener('resize',function(){size();if(reduce)draw();});
 if('IntersectionObserver' in window){new IntersectionObserver(function(es){var v=es[0].isIntersecting;if(v&&!run){run=true;if(!reduce)requestAnimationFrame(draw);}run=v;}).observe(c.parentNode);}}
})();
