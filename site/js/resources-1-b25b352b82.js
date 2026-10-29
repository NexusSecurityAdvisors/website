(function(){
 var root=document.getElementById('nsa');if(!root)return;root.classList.add('js');
 var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var prog=root.querySelector('.prog'),top=root.querySelector('.totop');
 function onScroll(){var d=document.documentElement,max=d.scrollHeight-d.clientHeight,y=window.pageYOffset||d.scrollTop;if(prog)prog.style.width=(max>0?y/max*100:0)+'%';if(top)top.classList.toggle('on',y>700);}
 window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 root.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.spot');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');});
 // filter + search
 var q=document.getElementById('q'),chips=[].slice.call(root.querySelectorAll('.fchip')),secs=[].slice.call(root.querySelectorAll('.rsec')),cnt=document.getElementById('cnt'),empty=document.getElementById('empty'),cur='all';
 function apply(){var term=(q.value||'').trim().toLowerCase(),total=0;
  secs.forEach(function(s){var show=0,catOk=cur==='all'||s.getAttribute('data-cat')===cur;
   [].forEach.call(s.querySelectorAll('.res'),function(a){var ok=catOk&&(!term||a.textContent.toLowerCase().indexOf(term)>-1);a.classList.toggle('hide',!ok);if(ok)show++;});
   s.classList.toggle('hide',show===0);total+=show;});
  cnt.textContent=total+(total===1?' resource':' resources');empty.style.display=total?'none':'block';}
 chips.forEach(function(c){c.addEventListener('click',function(){cur=c.getAttribute('data-f');chips.forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false');});apply();
   if(cur!=='all'){var t=document.getElementById(cur);if(t)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}});});
 q.addEventListener('input',apply);
 function fromHash(){var h=(location.hash||'').slice(1);if(/^[a-z]{2,20}$/.test(h)){var hc=chips.filter(function(c){return c.getAttribute('data-f')===h})[0];if(hc)hc.click();}}
 fromHash();window.addEventListener('hashchange',fromHash);
 
 // password checker (client-side only)
 (function(){var pw=document.getElementById('pw');if(!pw)return;
  var fill=document.getElementById('pwfill'),v=document.getElementById('pwv'),tips=document.getElementById('pwtips'),show=document.getElementById('pwshow'),gen=document.getElementById('pwgen');
  var common='password,123456,12345678,123456789,qwerty,abc123,111111,letmein,welcome,monkey,dragon,football,baseball,iloveyou,admin,login,master,sunshine,princess,shadow,superman,trustno1,passw0rd,starwars,whatever,freedom,hello,charlie,secret,summer,winter,spring,autumn,michael,jordan,hunter,ranger,soccer,hockey,killer,batman,cheese,computer,internet,security,changeme,default,qwertyuiop,asdfgh,zxcvbn,1q2w3e,qazwsx,company,nexus'.split(',');
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fmt(s){if(s<1)return'instantly';var u=[['years',31536000],['days',86400],['hours',3600],['minutes',60],['seconds',1]];if(s>31536000*1e6)return'more than a million years';for(var i=0;i<u.length;i++){if(s>=u[i][1]){var n=Math.round(s/u[i][1]);return n.toLocaleString()+' '+(n===1?u[i][0].slice(0,-1):u[i][0]);}}return'seconds';}
  function score(p){var L=p.length,pool=0,t=[];
   if(/[a-z]/.test(p))pool+=26;if(/[A-Z]/.test(p))pool+=26;if(/[0-9]/.test(p))pool+=10;if(/[^A-Za-z0-9]/.test(p))pool+=33;
   var bits=L*Math.log2(Math.max(pool,1)),low=p.toLowerCase(),pen=0;
   var base=low.replace(/[@4]/g,'a').replace(/3/g,'e').replace(/[1!]/g,'i').replace(/0/g,'o').replace(/[5$]/g,'s').replace(/7/g,'t');
   var hit=common.filter(function(w){return w.length>=4&&(low.indexOf(w)>-1||base.indexOf(w)>-1);});
   if(hit.length){var rest=base;hit.forEach(function(w){rest=rest.split(w).join('');});
     var restBits=rest.length*Math.log2(Math.max(pool,1));bits=Math.min(bits,hit.length*12+restBits);
     t.push('Contains common password words ("'+hit.slice(0,3).map(esc).join('", "')+'"), even with letter swaps. Attackers try these first.');}
   var dbl=/^(.{3,})\1+$/.exec(p);if(dbl){bits=Math.min(bits,dbl[1].length*Math.log2(Math.max(pool,1))+4);t.push('Repeating the same chunk twice adds almost no strength.');}
   if(/(.)\1{2,}/.test(p)){pen+=8;t.push('Avoid repeated characters like "aaa".');}
   if(/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(p)){pen+=10;t.push('Avoid sequences like "1234", "abcd", or keyboard runs.');}
   if(/(19|20)\d{2}/.test(p)){pen+=6;t.push('Years are easy to guess; avoid birth years or the current year.');}
   if(/^[A-Z][a-z]+\d+[!@#$%^&*]?$/.test(p)){pen+=10;t.push('"Word + numbers + symbol" is the first pattern attackers try.');}
   var wp=p.trim().split(/[\s\-_.,]+/);if(wp.length>=3&&/^[A-Za-z]+([\s\-_.,]+[A-Za-z0-9]+)+$/.test(p.trim())){bits=Math.min(bits,wp.length*12+(/[A-Z0-9]/.test(p)?4:0));t.push('Passphrases are estimated by word count (about 12 bits per randomly chosen word), since attackers guess whole words.');}
   bits=Math.min(128,Math.max(0,bits-pen));
   if(L<15)t.unshift('Use at least 15 characters (NIST SP 800-63B-4), or 8 or more only with MFA turned on. Length beats complexity.');
   if(L>=15&&!hit.length)t.push('Good length. A random passphrase of four to six unrelated words is easy to remember and strong.');
   t.push('Use a different password for every account and keep them in a password manager.');
   t.push('Turn on MFA or a passkey wherever you can.');
   return{bits:bits,tips:t};}
  function run(){var p=pw.value;if(!p){fill.style.width='0';v.textContent='Enter a password to see an estimate.';tips.innerHTML='';return;}
   var r=score(p),b=r.bits,g=Math.pow(2,b)/2,off=g/1e10,lvl,col,pct=Math.min(100,b/100*100);
   if(b<28){lvl='Very weak';col='#e5484d';}else if(b<45){lvl='Weak';col='#f08c3a';}else if(b<60){lvl='Fair';col='#e8c547';}else if(b<80){lvl='Strong';col='#3fb950';}else{lvl='Very strong';col='#2B9BF4';}
   fill.style.width=Math.max(6,pct)+'%';fill.style.background=col;
   v.textContent=lvl+' • about '+Math.round(b)+' bits • estimated offline crack time: '+fmt(off);
   tips.innerHTML=r.tips.map(function(x){return'<li>'+x+'</li>';}).join('');}
  pw.addEventListener('input',run);
  show.addEventListener('click',function(){var on=pw.type==='password';pw.type=on?'text':'password';show.textContent=on?'Hide':'Show';show.setAttribute('aria-pressed',on?'true':'false');});
  gen.addEventListener('click',function(){var cs='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_=+?',a=new Uint32Array(20),o='';(window.crypto||window.msCrypto).getRandomValues(a);for(var i=0;i<20;i++)o+=cs[a[i]%cs.length];pw.value=o;pw.type='text';show.textContent='Hide';show.setAttribute('aria-pressed','true');run();});
  window.addEventListener('pagehide',function(){pw.value='';});
 })();

 // canvas
 var c=document.getElementById('net');if(!c||!c.getContext)return;
 var x=c.getContext('2d'),W,H,pts=[],dpr=Math.min(window.devicePixelRatio||1,2),run=true;
 function size(){var r=c.getBoundingClientRect();W=r.width;H=r.height;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);var n=Math.round(Math.min(90,Math.max(30,W*H/9000)));pts=[];for(var i=0;i<n;i++)pts.push({x:W*(.3+Math.random()*.7),y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.6});}
 function draw(){x.clearRect(0,0,W,H);for(var i=0;i<pts.length;i++){var p=pts[i];if(!reduce){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;}
  for(var j=i+1;j<pts.length;j++){var q2=pts[j],d=Math.hypot(p.x-q2.x,p.y-q2.y);if(d<140){x.strokeStyle='rgba(43,155,244,'+(0.6*(1-d/140)).toFixed(3)+')';x.lineWidth=.7;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q2.x,q2.y);x.stroke();}}
  x.fillStyle='rgba(220,236,255,.9)';x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill();}
  if(run&&!reduce)requestAnimationFrame(draw);}
 c.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:.7';size();draw();window.addEventListener('resize',function(){size();if(reduce)draw();});
 if('IntersectionObserver' in window){new IntersectionObserver(function(es){var v=es[0].isIntersecting;if(v&&!run){run=true;if(!reduce)requestAnimationFrame(draw);}run=v;}).observe(c.parentNode);}
})();
