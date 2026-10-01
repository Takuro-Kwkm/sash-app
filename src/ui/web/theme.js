const STORAGE_KEY='sash.theme';
const MODES=new Set(['system','light','dark']);
const media=matchMedia('(prefers-color-scheme: dark)');

function storedMode(){
  const value=localStorage.getItem(STORAGE_KEY);
  return MODES.has(value)?value:'system';
}

function resolvedMode(mode){
  return mode==='system'?(media.matches?'dark':'light'):mode;
}

export function applyTheme(mode=storedMode()){
  const normalized=MODES.has(mode)?mode:'system';
  document.documentElement.dataset.themeMode=normalized;
  document.documentElement.dataset.theme=resolvedMode(normalized);
  document.documentElement.style.colorScheme=resolvedMode(normalized);
  const select=document.querySelector('#themeMode');
  if(select)select.value=normalized;
  return normalized;
}

applyTheme();

document.addEventListener('DOMContentLoaded',()=>{
  const select=document.querySelector('#themeMode');
  if(!select)return;
  select.value=storedMode();
  select.addEventListener('change',()=>{
    localStorage.setItem(STORAGE_KEY,select.value);
    applyTheme(select.value);
  });
});

media.addEventListener('change',()=>{
  if(storedMode()==='system')applyTheme('system');
});

window.__sashTheme={applyTheme,storageKey:STORAGE_KEY,getMode:storedMode};
