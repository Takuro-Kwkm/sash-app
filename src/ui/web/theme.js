(() => {
  const STORAGE_KEY='sash.theme.v1';
  const ALLOWED=new Set(['system','light','dark']);
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');

  function readPreference(){
    try {
      const stored=localStorage.getItem(STORAGE_KEY);
      if(ALLOWED.has(stored)) return stored;
    } catch {}
    const seeded=document.documentElement.dataset.themePreference;
    return ALLOWED.has(seeded)?seeded:'system';
  }

  function resolvedTheme(preference){
    if(preference==='dark') return 'dark';
    if(preference==='light') return 'light';
    return media?.matches?'dark':'light';
  }

  function apply(preference,{persist=false}={}){
    const safe=ALLOWED.has(preference)?preference:'system';
    const resolved=resolvedTheme(safe);
    document.documentElement.dataset.themePreference=safe;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.style.colorScheme=resolved;
    if(persist){
      try { localStorage.setItem(STORAGE_KEY,safe); } catch {}
    }
    const picker=document.querySelector('#themePreference');
    if(picker&&picker.value!==safe) picker.value=safe;
    window.dispatchEvent(new CustomEvent('sash-theme-change',{detail:{preference:safe,resolved}}));
    return resolved;
  }

  function handleSystemChange(){
    if(readPreference()==='system') apply('system');
  }

  function init(){
    apply(readPreference());
    const picker=document.querySelector('#themePreference');
    picker?.addEventListener('change',()=>apply(picker.value,{persist:true}));
    if(media?.addEventListener) media.addEventListener('change',handleSystemChange);
    else media?.addListener?.(handleSystemChange);
  }

  window.__sashTheme={
    storageKey:STORAGE_KEY,
    getPreference:readPreference,
    setPreference:(preference)=>apply(preference,{persist:true}),
    getResolvedTheme:()=>document.documentElement.dataset.theme,
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
