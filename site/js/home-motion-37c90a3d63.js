(function(){
'use strict';
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $(id){return document.getElementById(id);}
function onView(el,fn,th){if(!el)return;if(!('IntersectionObserver' in window)){fn(true);return;}
  new IntersectionObserver(function(es){es.forEach(function(e){fn(e.isIntersecting);});},{threshold:th||0.35}).observe(el);}

/* Hero: board risk summary plays once (about 4 s): risks move to lower likelihood and impact over 3 quarters. */
(function(){
  var fig=document.querySelector('#nsa .hmock'); if(!fig||reduce) return;
  var Q=[
    {q:'QUARTER 1',v:['12','3','7','2.4'],s:['Due in 30 days','Due in 60 days','Due in 90 days'],p:[[0,0],[0,0],[0,0]]},
    {q:'QUARTER 2',v:['9','1','10','2.7'],s:['Closed','In progress','Scheduled'],p:[[-38,30],[-38,60],[-38,30]]},
    {q:'QUARTER 3',v:['6','0','13','2.9'],s:['Closed','Closed','Tested'],p:[[-76,60],[-76,90],[-76,60]]}
  ];
  var vs=['mv1','mv2','mv3','mv4'].map($), ss=['ms1','ms2','ms3'].map($), ps=['mp1','mp2','mp3'].map($), q=$('mq');
  if(!q||ps.some(function(x){return !x;})) return;
  function show(k){var d=Q[k];
    ps.forEach(function(g,i){g.style.transform='translate('+d.p[i][0]+'px,'+d.p[i][1]+'px)';});
    [q].concat(vs,ss).forEach(function(t){t.classList.add('m-fade');});
    setTimeout(function(){q.textContent=d.q;vs.forEach(function(t,i){t.textContent=d.v[i];});ss.forEach(function(t,i){t.textContent=d.s[i];});
      [q].concat(vs,ss).forEach(function(t){t.classList.remove('m-fade');});},300);
  }
  var played=false;
  onView(fig,function(vis){if(!vis||played)return;played=true;
    setTimeout(function(){show(1);},900);setTimeout(function(){show(2);},2600);},0.5);
})();

/* Readiness Check demo: loops while visible; pausable (WCAG 2.2.2); static result when reduced motion is on. */
(function(){
  var fig=$('cdemo'); if(!fig) return;
  var text=$('cd-text'), step=$('cd-step'), bar=$('cd-bar'), ring=$('cd-ring'), pct=$('cd-pct'), btn=$('cd-pause');
  var ans=fig.querySelectorAll('.cd-ans span');
  var Qs=[
    ['Do you have an inventory of the AI tools, models, and agents your company uses?','partly'],
    ['Do you have an AI acceptable-use policy that says what data may and may not be put into AI tools?','no'],
    ['Is someone accountable for AI risk decisions (a named owner or committee)?','unsure'],
    ['Are AI agents limited to the least access they need, with human approval for risky actions?','partly']
  ];
  var C=213.6, FINAL=0.44;
  function setRing(f){ring.style.strokeDashoffset=String(C*(1-f));}
  function result(){fig.classList.add('res');step.textContent='Results';bar.style.width='100%';}
  if(reduce){result();setRing(FINAL);return;}
  var t=[],running=false,paused=false,visible=false;
  function clear(){t.forEach(clearTimeout);t=[];}
  function at(ms,fn){t.push(setTimeout(fn,ms));}
  function cycle(){
    clear();fig.classList.remove('res');setRing(0);pct.textContent='0%';
    var ms=0;
    Qs.forEach(function(q,i){
      at(ms,function(){text.textContent=q[0];step.textContent='Question '+(i===3?8:i+1)+' of 8';bar.style.width=((i===3?8:i+1)/8*100)+'%';
        ans.forEach(function(a){a.classList.remove('on');});});
      at(ms+900,function(){ans.forEach(function(a){a.classList.toggle('on',a.getAttribute('data-a')===q[1]);});});
      ms+=1700;
    });
    at(ms,function(){result();setRing(FINAL);
      var n=0,iv=setInterval(function(){n+=4;if(n>=44){n=44;clearInterval(iv);}pct.textContent=n+'%';},40);t.push(iv);});
    at(ms+5200,function(){if(visible&&!paused)cycle();else running=false;});
    running=true;
  }
  function stop(){clear();running=false;}
  onView(fig,function(vis){visible=vis;if(vis&&!paused&&!running)cycle();if(!vis)stop();},0.35);
  btn.addEventListener('click',function(){paused=!paused;btn.setAttribute('aria-pressed',paused?'true':'false');
    btn.textContent=paused?'Play animation':'Pause animation';if(paused){stop();}else if(visible){cycle();}});
})();
})();
