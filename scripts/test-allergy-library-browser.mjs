// Called only by the disposable local runner, while its isolated DB is alive.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
export async function exerciseLibraryBrowser({accounts,db}){
 if(process.env.RUN_DISPOSABLE_ALLERGY_LAB!=='1'||!process.env.MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL?.startsWith('http://127.0.0.1:'))throw Error('Disposable local runner required');
 const {chromium}=require(process.env.MEALCADDIE_PLAYWRIGHT_MODULE??'playwright');
 const env={...process.env,NEXT_TEST_WASM_DIR:'.\\node_modules\\@next\\swc-wasm-nodejs',NEXT_PUBLIC_SUPABASE_URL:process.env.MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.MEALCADDIE_ALLERGY_LOCAL_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:'unused-local-placeholder',OPENAI_API_KEY:'unused-local-placeholder',RESEND_API_KEY:''};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3011'],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let serverFailed=false;server.on('error',()=>{serverFailed=true;});server.stdout.resume();server.stderr.resume();
 let browser;const results=[],external=[],consoleErrors=[];
 const base='http://127.0.0.1:3011';
 try{
  for(let i=0;i<120;i++){if(serverFailed)throw Error('Local Next process unavailable');try{if((await fetch(base+'/labs/allergy-aware/app')).ok)break;}catch{}if(i===119)throw Error('Local application unavailable');await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const account of accounts){
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
   page.on('pageerror',e=>consoleErrors.push(e.name));
   page.on('response',async response=>{if(response.url().endsWith('/api/labs/allergy-library')&&response.status()>=400){const body=await response.json().catch(()=>({}));console.error('Local browser API failure',response.status(),body.code??'',body.error??'');}});
   await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)){external.push(url.origin);await route.abort();}else await route.continue();});
   const idle=()=>page.waitForFunction(()=>!document.querySelector('nav button:disabled')&&!!document.querySelector('nav'),{},{timeout:90000});
   const navigate=async name=>{await page.getByRole('navigation',{name:'MealCaddie sections'}).getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{name,exact:true,level:2}).waitFor();};
   await page.goto(base+'/labs/allergy-aware/app');
   // Next's development toolbar overlaps the bottom-left tab at phone widths.
   // Exclude its pointer interception, not application controls or JS errors.
   await page.addStyleTag({content:'nextjs-portal { pointer-events: none !important; }'});
   await page.getByLabel('Disposable local email').fill(account.email);await page.getByLabel('Disposable local password').fill(account.password);
   await page.getByRole('button',{name:'Sign in to local application',exact:true}).click();await idle();
   console.log('BROWSER '+account.plan+' local sign-in');
   await page.getByRole('button',{name:'Generate seven dinner candidates'}).click();await idle();
   try{await page.getByRole('heading',{name:'Meals',exact:true,level:2}).waitFor({timeout:5000});}catch{throw Error('Local generation UI did not reach Meals: '+(await page.getByRole('status').allTextContents()).join(' '));}
   assert.equal(await page.locator('article').count(),8);
   console.log('BROWSER '+account.plan+' generated meal cards');
   const first=page.locator('article').first(),name=await first.locator('h2').innerText();
   await first.getByRole('button',{name:'Add to This Week',exact:true}).click();await idle();
   const dessertCard=page.locator('article').last();await dessertCard.getByRole('button',{name:'Add to This Week',exact:true}).click();await idle();
   await navigate('Cook');assert.equal(await page.locator('article').count(),2);const cooking=page.locator('article').first();assert.equal(await cooking.locator('h3').innerText(),name);
   await cooking.getByRole('combobox').selectOption('Tuesday');await idle();
   await cooking.getByRole('button',{name:'View Recipe',exact:true}).click();await idle();
   const dialog=page.getByRole('dialog',{name:'Recipe',exact:true});await dialog.waitFor();assert.ok(await dialog.getByLabel('Engineering candidate limitations').isVisible());
   await dialog.getByRole('checkbox').first().check();await dialog.getByRole('button',{name:'Cooking steps',exact:true}).click();await dialog.getByRole('button',{name:'Done & next',exact:true}).click();
   // Escape closes, browser restores the launching control. Check keyboard trap.
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),true);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'View Recipe');
   await cooking.getByText('More',{exact:true}).click();await cooking.getByRole('button',{name:'Save to Vault',exact:true}).click();await idle();
   if(account.plan==='free')await page.screenshot({path:'../../outputs/allergy-library-app-cook-390.png',fullPage:true});
   await navigate('Vault');assert.equal(await page.locator('article').count(),1);await page.locator('article').first().getByRole('button',{name:'View Recipe',exact:true}).click();await idle();await dialog.waitFor();await page.keyboard.press('Escape');
   console.log('BROWSER '+account.plan+' Cook / interactive recipe / Vault');
   await navigate('Shop');assert.ok(await page.getByText('Checked recipe requirements',{exact:true}).isVisible());
   assert.equal((await db.query("select recipe_data from weekly_menus where user_id=$1 and status='active_week' and type='dinner'",[account.id])).rows[0].recipe_data.scheduledDay,'Tuesday');
   await navigate('Week');assert.ok(await page.getByText(name,{exact:true}).isVisible());
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});for(const tab of ['Week','Plan','Meals','Shop','Cook','Vault']){await navigate(tab);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${tab} ${width}`);}
    results.push({tier:account.plan,width,tabs:['Week','Plan','Meals','Shop','Cook','Vault'],horizontalOverflow:false});
   }
   await navigate('Meals');await page.locator('article').first().getByText('More',{exact:true}).click();await page.locator('article').first().getByRole('button',{name:'Replace',exact:true}).click();await idle();
   const replacement=page.getByRole('dialog',{name:'Choose a checked replacement',exact:true});await replacement.waitFor();await replacement.locator('li button').first().click();await idle();await replacement.waitFor({state:'hidden'});
   assert.equal(await page.locator('article').count(),8);await page.getByRole('button',{name:'Recheck saved content',exact:true}).click();await idle();assert.equal(await page.locator('article').count(),8);
   assert.equal((await db.query("select count(*)::int n from smartcart_generation_jobs where user_id=$1 and status='completed'",[account.id])).rows[0].n,2,'replacement and reads consume no plan');
   await navigate('Cook');await page.locator('article').first().getByText('More',{exact:true}).click();await page.locator('article').first().getByRole('button',{name:'Cooked It',exact:true}).click();await idle();assert.equal(await page.locator('article').count(),1);
   await navigate('Vault');await page.locator('article').first().getByRole('button',{name:'Add to This Week',exact:true}).click();await idle();await navigate('Cook');assert.equal(await page.locator('article').count(),2,'Vault restore preserves the original signed recipe');
   await navigate('Week');await page.getByText('Week details',{exact:true}).click();assert.equal(await page.locator('dl div').filter({hasText:'Cooked this week'}).locator('dd').innerText(),'1');
   await navigate('Plan');await page.getByLabel('Ingredient avoidance',{exact:true}).fill('Tahini');await idle();await navigate('Meals');assert.equal(await page.locator('article').count(),0,'changed settings cannot reuse prior generated cards');
   await page.getByRole('button',{name:'Clear local session',exact:true}).click();assert.equal(await page.locator('article').count(),0);
   assert.equal(await page.locator('dialog[open]').count(),0);
   await context.close();
   results.push({tier:account.plan,journey:'Plan → dinner/dessert Meals → Week/Cook → signed recipe → Vault → Shop → replacement → Cooked It → Vault restore',schedule:true,keyboardDialog:true,replacementRechecked:true,quotaUnchangedByReadsAndReplacement:true,cookedCount:true,staleSettingsWithheld:true,clearedSessionWithheld:true});
  }
  assert.deepEqual(external,[],'No external service is contacted by the local runtime');assert.deepEqual(consoleErrors,[]);
  fs.writeFileSync('evals/allergy-library-application-browser.json',JSON.stringify({environment:'Isolated headless Edge + real loopback Auth/PostgREST/PostgreSQL, synthetic accounts only',results,externalRequests:0,providerCalls:0,emails:0,limitations:'Not physical-device or NVDA/VoiceOver/TalkBack evidence'},null,2)+'\n');
  return results.length;
 }finally{
  if(browser)await browser.close();
  if(server.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else server.kill('SIGTERM');}
 }
}
