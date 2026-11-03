(function(){
  var hm={'#us-ai':'t-usai','#ai-policy':'t-usai','#nist-ai':'t-nistai','#ai-rmf':'t-nistai','#state-ai':'t-stateai','#california':'t-stateai'};
  var t=hm[location.hash]&&document.getElementById(hm[location.hash]);
  if(t)t.click();
  var box=document.getElementById('airmf'),out=document.getElementById('airmfout');
  if(!box||!out)return;
  var f=['<b>Govern</b> is the foundation: policies, roles, accountability, and a culture of risk management that run through the other three functions.',
    '<b>Map</b> sets context: what each AI system is for, who it affects, what data it uses, and what could go wrong.',
    '<b>Measure</b> tests and tracks risk: accuracy, bias, robustness, security (including prompt injection), and privacy, before launch and over time.',
    '<b>Manage</b> acts on what you found: prioritize and treat risks, respond to incidents, monitor vendors, and retire systems safely.'];
  box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    box.querySelectorAll('.on').forEach(function(x){x.classList.remove('on')});
    b.classList.add('on');out.innerHTML=f[+b.getAttribute('data-i')];});
  box.querySelector('button').classList.add('on');
})();
