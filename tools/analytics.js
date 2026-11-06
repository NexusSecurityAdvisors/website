!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="Wc Gc Qc Zc Xc init Ih Mh xh Ch Ah Nu Th Fh wh jh Bh zh Hh Uh Wh capture getExtension Eh dr Zh calculateEventProperties Gh register register_once register_for_session unregister unregister_for_session Yh Sh Jh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys onActiveMatchingSurveysChanged renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync td identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset ed shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Kh Lh createPersonProfile setInternalOrTestUser Xh ih th opt_in_capturing opt_out_capturing eh has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Oh debug qu Os getPageViewId captureTraceFeedback captureTraceMetric mh".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
// Only production sends analytics. Cloudflare preview builds (*.pages.dev) and local previews
// skip PostHog and HubSpot so they don't pollute reports. The posthog stub above stays defined,
// so page scripts can call it safely; nothing is sent. Lead-source attribution below still runs.
var NSA_PROD=/^(www\.)?nexussecurityadvisors\.com$/.test(location.hostname);
if(!NSA_PROD){window.__nsaq={push:function(){}};}
else{
// Consent: visitors in Europe (EU/EEA, UK, Switzerland) start opted out of analytics until they accept
// analytics cookies in the HubSpot consent banner. Region comes from the browser time zone, so nothing
// is sent to work it out. Everyone else is measured by default and can still decline in the banner.
var NSA_EU=(function(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
 return /^Europe\//.test(z)||/^Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)$/.test(z)}catch(e){return false}})();
posthog.init('phc_DuzGMcGgYX9NfaIQr0gtNWEDi2dmQr5kZr4CwxgUJA2', {
api_host: '/r7', // first-party relay (functions/r7), so ad blockers don't drop events
ui_host: 'https://us.posthog.com',
defaults: '2026-05-30',
person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
respect_dnt: true, // honour Do Not Track
opt_out_capturing_by_default: NSA_EU, // EU/UK: nothing is captured or stored until consent
})
// The HubSpot banner is the single consent switch. Its callback runs once HubSpot loads (immediately
// for a returning visitor, or when the banner is answered). If HubSpot is blocked, EU visitors stay opted out.
;(window._hsp=window._hsp||[]).push(['addPrivacyConsentListener',function(c){try{
 var ok=c&&c.categories?!!c.categories.analytics:!!(c&&c.allowed);
 if(ok){if(posthog.has_opted_out_capturing()||(NSA_EU&&!posthog.has_opted_in_capturing()))posthog.opt_in_capturing()} // outside Europe capture is already on unless the visitor declined earlier; avoids a $opt_in event per visitor
 else if(!posthog.has_opted_out_capturing())posthog.opt_out_capturing();}catch(e){}}]);
// Internal traffic: open any page once with ?internal=1 in each of your own browsers to tag them
// (PostHog's default filter then excludes them); ?internal=0 removes the tag.
;(function(){try{var v=new URLSearchParams(location.search).get('internal');
 if(v==='1')posthog.register({internal:true});else if(v==='0')posthog.unregister('internal');}catch(e){}})();
// Page scripts load before this deferred file, so they queue events in window.__nsaq.
// Send anything queued, then route later pushes straight to PostHog.
;(function(){var q=window.__nsaq||[];window.__nsaq={push:function(e){try{posthog.capture(e[0],e[1])}catch(x){}}};
 for(var i=0;i<q.length;i++)window.__nsaq.push(q[i]);})();
;(function(){var s=document.createElement('script');s.id='hs-script-loader';s.async=true;s.defer=true;s.src='https://js-na2.hs-scripts.com/247780434.js';document.head.appendChild(s);})();
}
// Lead-source attribution (first-party, no identifiers). Remembers how a visitor first
// arrived (UTM tags, ad click IDs, or the referring site, including AI assistants) and the
// latest non-direct visit, for 90 days in this browser only. The intake form on
// /get-started sends these with the request so each Zoho CRM lead shows where it came from.
;(function(){try{
 var K='nsa_attr',TTL=90*864e5,now=Date.now(),ls=window.localStorage;
 var q=new URLSearchParams(location.search),ref=document.referrer||'',host='';
 try{host=ref?new URL(ref).hostname.replace(/^www\./,'').toLowerCase():''}catch(e){}
 if(/(^|\.)nexussecurityadvisors\.com$/.test(host))host='';
 var AI=/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com|phind\.com|meta\.ai|grok\.com|deepseek\.com|mistral\.ai|kagi\.com)$/;
 var SE=/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.brave\.com|startpage\.com|yandex\.[a-z.]+|baidu\.com)$/;
 var SOC=/(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|fb\.com|t\.co|x\.com|twitter\.com|reddit\.com|youtube\.com|instagram\.com|github\.com|medium\.com|substack\.com)$/;
 function c(v){return String(v||'').replace(/[^\w.\-+ /:@]/g,'').slice(0,100)}
 var t={src:c(q.get('utm_source')),med:c(q.get('utm_medium')),cmp:c(q.get('utm_campaign')),term:c(q.get('utm_term'))};
 if(q.get('gclid')||q.get('gbraid')||q.get('wbraid')){t.src=t.src||'google';t.med=t.med||'cpc';}
 else if(q.get('msclkid')){t.src=t.src||'bing';t.med=t.med||'cpc';}
 else if(q.get('li_fat_id')){t.src=t.src||'linkedin';t.med=t.med||'paid-social';}
 if(!t.src&&host)t.src=host;
 var h=t.src.toLowerCase();
 if(!t.med&&h)t.med=AI.test(h)?'ai-assistant':SE.test(h)?'organic':SOC.test(h)?'social':'referral';
 if(t.src){t.ref=host;t.land=c(location.pathname);t.ts=new Date(now).toISOString().slice(0,10);}
 var s=null;try{s=JSON.parse(ls.getItem(K)||'null')}catch(e){}
 if(!s||!s.exp||s.exp<now)s={first:t.src?t:{src:'(direct)',med:'(none)',land:c(location.pathname),ts:new Date(now).toISOString().slice(0,10)}};
 if(t.src)s.last=t;
 s.exp=now+TTL;ls.setItem(K,JSON.stringify(s));
}catch(e){}})();
window.nsaAttribution=function(){try{var s=JSON.parse(localStorage.getItem('nsa_attr')||'null');return s&&s.exp>Date.now()?s:null}catch(e){return null}};
