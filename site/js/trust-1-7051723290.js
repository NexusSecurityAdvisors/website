(function(){
 var root=document.getElementById('nsa');if(!root)return;root.classList.add('js');
 var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var prog=root.querySelector('.prog'),top=root.querySelector('.totop');
 function onScroll(){var d=document.documentElement,max=d.scrollHeight-d.clientHeight,y=window.pageYOffset||d.scrollTop;if(prog)prog.style.width=(max>0?y/max*100:0)+'%';if(top)top.classList.toggle('on',y>700);}
 window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 root.addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.spot');if(!t)return;var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');});

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
