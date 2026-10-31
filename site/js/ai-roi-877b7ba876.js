(function(){
 var ids=['users','hours','save','rate','lic','train','gov','salary','ben'];
 function v(k){var e=document.getElementById('r_'+k);var n=parseFloat(e&&e.value);return isFinite(n)&&n>=0?n:0;}
 function $(n){return '$'+Math.round(n).toLocaleString('en-US');}
 function calc(){
  var u=v('users'),h=v('hours'),s=Math.min(v('save'),90)/100,r=v('rate'),lic=v('lic'),tr=v('train'),gov=v('gov'),sal=v('salary'),ben=v('ben')/100;
  var hours=u*h*s*48, value=hours*r, cost=u*lic*12+u*tr+gov, net=value-cost;
  var roi=cost>0?net/cost*100:0, monthly=(value-(u*lic*12+gov))/12, pay=monthly>0?(u*tr)/monthly:Infinity;
  var fte=hours/2080, hire=fte*sal*(1+ben);
  var set=function(id,x){var e=document.getElementById(id);if(e)e.textContent=x;};
  set('o_hours',Math.round(hours).toLocaleString('en-US'));set('o_value',$(value));set('o_cost',$(cost));set('o_net',(net<0?'-':'')+$(Math.abs(net)));
  set('o_roi',Math.round(roi)+'%');set('o_pay',pay===Infinity?'Not within a year':(pay<1?'Under 1 month':pay.toFixed(1)+' months'));
  set('o_fte',fte.toFixed(2)+' FTE');set('o_hire',$(hire)+' / yr');
  var sum=net>0?('Training '+u+' people to use AI frees about '+fte.toFixed(1)+' full-time equivalents of capacity for '+$(cost)+' in year one, versus about '+$(hire)+' per year to hire the same capacity.'):'At these assumptions, AI costs more than the time it saves. Focus on fewer, higher-value tasks or the people who spend the most time on routine work.';
  set('o_sum',sum);}
 ids.forEach(function(k){var e=document.getElementById('r_'+k);if(e)e.addEventListener('input',calc);});
 if(document.getElementById('roiForm'))calc();
})();
