(function(){
 function v(k){var e=document.getElementById('b_'+k);var n=parseFloat(e&&e.value);return isFinite(n)&&n>=0?n:0;}
 function $(n){return (n<0?'-':'')+'$'+Math.round(Math.abs(n)).toLocaleString('en-US');}
 function set(id,x){var e=document.getElementById(id);if(e)e.textContent=x;}
 function calc(){
  var u=Math.max(v('users'),1),y=Math.max(v('years'),1),lic=v('lic'),b=v('build'),host=v('host'),use=v('use'),m=v('maint')/100,gov=v('gov'),mo=y*12;
  var buy=u*lic*mo+gov*y, build=b+(host+use)*mo+b*m*y+gov*y;
  set('bo_buy',$(buy));set('bo_build',$(build));set('bo_ubuy',$(buy/u/mo));set('bo_ubuild',$(build/u/mo));set('bo_diff',$(buy-build));
  var fixed=b+(host+use)*mo+b*m*y, be=lic>0?Math.ceil(fixed/(lic*mo)):Infinity;
  set('bo_be',be===Infinity?'n/a':be.toLocaleString('en-US')+' users');
  set('bo_sum',build<buy?('At these assumptions, building your own costs about '+$(buy-build)+' less over '+y+' year'+(y>1?'s':'')+', and you keep full control of your data.'):('At these assumptions, buying costs about '+$(build-buy)+' less over '+y+' year'+(y>1?'s':'')+'. Building can still make sense if you handle sensitive data or need deep integration; it breaks even on cost at about '+(be===Infinity?'n/a':be.toLocaleString('en-US'))+' users.'));}
 ['users','years','lic','build','host','use','maint','gov'].forEach(function(k){var e=document.getElementById('b_'+k);if(e)e.addEventListener('input',calc);});
 if(document.getElementById('bbForm'))calc();
})();
