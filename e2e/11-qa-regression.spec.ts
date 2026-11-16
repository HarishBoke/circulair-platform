import { test, expect, request, type APIRequestContext } from '@playwright/test';

const BASE='http://127.0.0.1:3001';
test.skip(process.env.QA_LOCAL !== '1' || process.env.BASE_URL !== BASE, 'Data-writing regression requires the isolated localhost QA server');
let owner:APIRequestContext, other:APIRequestContext, cookieState:any, battery:any;
const password='Local-QA-only-Password1!';
async function rpc(api:APIRequestContext,name:string,input:any={},mutation=false){
  return mutation ? api.post(`/api/trpc/${name}`,{data:{json:input}}) : api.get(`/api/trpc/${name}`,{params:{input:JSON.stringify({json:input})}});
}
test.beforeAll(async({},info)=>{
  owner=await request.newContext({baseURL:BASE});other=await request.newContext({baseURL:BASE});
  const seed=`${Date.now()}-${info.project.name}`;
  for(const [api,label] of [[owner,'owner'],[other,'other']] as const){
    const r=await api.post('/api/auth/register',{data:{name:`QA ${label}`,email:`${label}-${seed}@example.invalid`,password}});expect(r.status()).toBe(201);
  }
  cookieState=await owner.storageState();
  const r=await rpc(owner,'bpan.generate',{countryCode:'IN',manufacturerId:'QAT',capacityCode:'A1',chemistryCode:'F',voltageCode:'LA',cellOriginCode:'IN',extinguisherClass:'D',mfgYear:2026,mfgMonth:11,mfgDay:16,factoryCode:info.project.name==='mobile'?'M':'D',serialNumber:Date.now().toString(36).slice(-4).toUpperCase()},true);
  expect(r.status()).toBe(200);battery=(await r.json()).result.data.json;
});
test.afterAll(async()=>{await owner?.dispose();await other?.dispose();});
test('real registration creates a usable authenticated session',async()=>{
  const me=await owner.get('/api/auth/me');expect(me.status()).toBe(200);expect((await me.json()).email).toContain('owner-');
  const current=await rpc(owner,'auth.me');expect(current.status()).toBe(200);expect((await current.json()).result.data.json).not.toHaveProperty('passwordHash');
});
test('real battery creation persists and can be read',async()=>{
  expect(battery.bpan).toHaveLength(21);expect(battery.battery.id).toBeGreaterThan(0);
  const r=await rpc(owner,'bpan.get',{bpan:battery.bpan});expect(r.status()).toBe(200);expect((await r.json()).result.data.json.battery.bpan).toBe(battery.bpan);
});
test('cross-account webhook deletion cannot delete an owned row',async()=>{
  const created=await rpc(owner,'webhook.create',{name:'Local QA only',url:'https://example.invalid/no-delivery',events:['qa_only'],maxRetries:0},true);
  expect(created.status()).toBe(200);const id=(await created.json()).result.data.json.id;
  const deletion=await rpc(other,'webhook.delete',{webhookId:id},true);expect(deletion.status()).toBe(200);
  const list=await rpc(owner,'webhook.list');expect((await list.json()).result.data.json.some((x:any)=>x.id===id)).toBe(true);
});
test('unpaid purchase and hostile-origin mutations are rejected',async()=>{
  expect((await rpc(owner,'marketplace.purchase',{listingId:1,offeredPriceInr:0},true)).status()).toBe(403);
  expect((await owner.post('/api/auth/logout',{headers:{Origin:'https://attacker.invalid'}})).status()).toBe(403);
  expect((await owner.get('/api/auth/me')).status()).toBe(200);
});
test('authenticated dashboard renders without a runtime error',async({page})=>{
  await page.context().addCookies(cookieState.cookies);await page.goto('/dashboard');
  await expect(page.getByRole('heading',{name:/dashboard|overview/i}).first()).toBeVisible({timeout:20000});
  await expect(page.locator('body')).not.toContainText('Something went wrong');
});
test('alert-rule filters open with valid all-options',async({page})=>{
  await page.context().addCookies(cookieState.cookies);await page.goto('/alert-rules');
  const chemistry=page.getByRole('combobox').filter({hasText:'All chemistries'});
  await expect(chemistry).toBeVisible({timeout:20000});await chemistry.click();
  await expect(page.getByRole('option',{name:'All chemistries'})).toBeVisible();await page.getByRole('option',{name:'NMC',exact:true}).click();
  await page.getByRole('combobox').filter({hasText:'All metrics'}).click();await expect(page.getByRole('option',{name:'All metrics'})).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toContainText('Something went wrong');
});
test('public homepage fits the emulated viewport',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:/Operating System/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
});
