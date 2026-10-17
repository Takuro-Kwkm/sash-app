import { chromium } from 'playwright';

const origin=String(process.env.STAGING_ALIAS??'').replace(/\/+$/,'');
const required=(name)=>{
  const value=String(process.env[name]??'').trim();
  if(!value)throw new Error(`${name}_MISSING`);
  return value;
};
const users={
  a:{email:required('RC_STAGING_USER_A_EMAIL'),password:required('RC_STAGING_USER_A_PASSWORD')},
  b:{email:required('RC_STAGING_USER_B_EMAIL'),password:required('RC_STAGING_USER_B_PASSWORD')},
};
const workspaceA=required('RC_WORKSPACE_A');
const workspaceB=required('RC_WORKSPACE_B');
const marker=required('RC_MARKER');
if(!origin)throw new Error('STAGING_ALIAS_MISSING');

const devices=[
  {name:'desktop',viewport:{width:1440,height:1000}},
  {name:'smartphone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
];

async function expectText(page,selector,fragment,timeout=15000){
  await page.waitForFunction(([s,t])=>document.querySelector(s)?.textContent?.includes(t),[selector,fragment],{timeout});
}
async function login(page,user){
  await page.locator('#signInForm [name="email"]').fill(user.email);
  await page.locator('#signInForm [name="password"]').fill(user.password);
  await page.locator('#signInForm button[type="submit"]').click();
  await expectText(page,'#sessionBadge','ログイン中');
  await page.locator('#workspaceSelect').waitFor({state:'visible'});
}
async function workspace(page,id){
  await page.locator('#workspaceSelect').selectOption(id);
  await page.waitForFunction(([selector,value])=>document.querySelector(selector)?.value===value,['#currentWorkspaceId',id]);
  await page.locator('#workCard').waitFor({state:'visible'});
}
async function logout(page){
  await page.locator('#signOutButton').click();
  await expectText(page,'#sessionBadge','未ログイン');
}

const expectedDenied=/Failed to load resource: the server responded with a status of (401|403)/;
const browser=await chromium.launch({headless:true});
try{
  for(const device of devices){
    const context=await browser.newContext({viewport:device.viewport,isMobile:device.isMobile??false,hasTouch:device.hasTouch??false,locale:'ja-JP'});
    const page=await context.newPage();
    const errors=[];
    const expected=[];
    page.on('console',message=>{
      if(message.type()==='error'){
        const text=message.text();
        if(expectedDenied.test(text))expected.push(text);else errors.push(`console:${text}`);
      }
    });
    page.on('pageerror',error=>errors.push(`page:${error.message}`));
    page.on('requestfailed',request=>errors.push(`request:${request.method()} ${request.url()} ${request.failure()?.errorText??''}`));
    page.on('response',response=>{if(response.status()>=500)errors.push(`http${response.status()}:${response.url()}`)});

    await page.goto(`${origin}/public-saas`,{waitUntil:'networkidle'});
    await expectText(page,'#providerStatus','Supabase接続済み');
    await login(page,users.a);
    await workspace(page,workspaceA);
    await expectText(page,'#projectList',`${marker}-project-A`);
    await expectText(page,'#projectList',`${marker}-opening-A`);
    await page.screenshot({path:`artifacts/rc-staging/browser/${device.name}-a.png`,fullPage:true});

    await logout(page);
    await login(page,users.a);
    await workspace(page,workspaceA);
    await expectText(page,'#projectList',`${marker}-project-A`);
    await logout(page);

    await login(page,users.b);
    await workspace(page,workspaceB);
    await page.locator('#targetWorkspaceId').fill(workspaceA);
    await page.locator('#tenantReadTestButton').click();
    await expectText(page,'#tenantIsolationResult','READ = PASS / 403 DENIED');
    await page.locator('#tenantWriteTestButton').click();
    await expectText(page,'#tenantIsolationResult','WRITE = PASS / 403 DENIED');
    await page.screenshot({path:`artifacts/rc-staging/browser/${device.name}-b.png`,fullPage:true});

    if(errors.length)throw new Error(`${device.name}: unexpected browser errors ${errors.join(' | ')}`);
    if(expected.length<3)throw new Error(`${device.name}: expected denial evidence incomplete ${expected.length}`);
    console.log(`STAGING_PUBLIC_SAAS_BROWSER_${device.name.toUpperCase()}=PASS`);
    await context.close();
  }
}finally{
  await browser.close();
}
console.log('STAGING_PUBLIC_SAAS_FULL_BROWSER_QA_GATE=PASS');
