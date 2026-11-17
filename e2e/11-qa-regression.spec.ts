import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { BPAN_REGISTRATION_BLOCKED_REASON } from '../shared/bpanContract';

const BASE='http://127.0.0.1:3001';
test.skip(process.env.QA_LOCAL !== '1' || process.env.BASE_URL !== BASE, 'Data-writing regression requires the isolated localhost QA server');
let owner:APIRequestContext, other:APIRequestContext, admin:APIRequestContext, cookieState:any, adminState:any, battery:any;
const password='Local-QA-only-Password1!';
async function rpc(api:APIRequestContext,name:string,input:any={},mutation=false){
  return mutation ? api.post(`/api/trpc/${name}`,{data:{json:input}}) : api.get(`/api/trpc/${name}`,{params:{input:JSON.stringify({json:input})}});
}
test.beforeAll(async({},info)=>{
  owner=await request.newContext({baseURL:BASE});other=await request.newContext({baseURL:BASE});
  admin=await request.newContext({baseURL:BASE});
  const seed=`${Date.now()}-${info.project.name}`;
  for(const [api,label] of [[owner,'owner'],[other,'other'],[admin,'admin']] as const){
    const r=await api.post('/api/auth/register',{data:{name:`QA ${label}`,email:`${label}-${seed}@example.invalid`,password}});expect(r.status()).toBe(201);
  }
  const dbUrl=new URL(process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL || 'https://invalid');
  if(!['postgres:','postgresql:'].includes(dbUrl.protocol) || dbUrl.hostname!=='127.0.0.1' || dbUrl.port!=='5432' || dbUrl.pathname!=='/circulair_qa' || dbUrl.search || dbUrl.hash)throw new Error('Admin fixture requires isolated localhost QA database');
  const registration=await rpc(owner,'bpan.generate',{countryCode:'IN',manufacturerId:'QAT',capacityCode:'A1',chemistryCode:'F',voltageCode:'LA',cellOriginCode:'IN',extinguisherClass:'D',mfgYear:2026,mfgMonth:11,mfgDay:16,factoryCode:info.project.name==='mobile'?'M':'D',serialNumber:randomBytes(2).toString('hex').toUpperCase()},true);
  expect(registration.status()).toBe(412);
  expect((await registration.json()).error.json).toMatchObject({message:BPAN_REGISTRATION_BLOCKED_REASON,data:{code:'PRECONDITION_FAILED'}});
  const empty=await rpc(owner,'bpan.list',{limit:100,offset:0});expect(empty.status()).toBe(200);expect((await empty.json()).result.data.json.total).toBe(0);
  // Approved QA-only legacy fixture, not a successful issuer registration or pilot acceptance.
  // Keep writes bounded to one battery/one informational alert per freshly registered owner.
  const pool=new Pool({connectionString:dbUrl.toString()});
  try {
    await pool.query('BEGIN');
    const promoted=await pool.query('UPDATE users SET role = $1 WHERE email = $2 RETURNING id',['admin',`admin-${seed}@example.invalid`]);expect(promoted.rowCount).toBe(1);
    const fresh=await pool.query('SELECT id FROM users WHERE email = $1',[`owner-${seed}@example.invalid`]);expect(fresh.rowCount).toBe(1);
    const ownerId=fresh.rows[0].id, factory=info.project.name==='mobile'?'M':'D', serial=randomBytes(2).toString('hex').toUpperCase();
    const alias=`INQATA1FLAIND6KP${factory}${serial}`;expect(alias).toHaveLength(21);
    const inserted=await pool.query('INSERT INTO batteries (bpan,"countryCode","manufacturerId","capacityCode","capacityKwh","chemistryCode",chemistry,"voltageCode","voltageV","cellOriginCode","cellOriginCountry","extinguisherClass","mfgYear","mfgMonth","mfgDay","factoryCode","serialNumber","registeredById","ownerId","currentSoh") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18,$19) RETURNING id,bpan',[alias,'IN','QAT','A1','1','F','NMC','LA','48','IN','India','D',2026,11,16,factory,serial,ownerId,'100']);expect(inserted.rowCount).toBe(1);
    battery={bpan:alias,battery:inserted.rows[0]};
    const alert=await pool.query('INSERT INTO alerts ("userId",bpan,"batteryId",type,severity,title,message,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[ownerId,alias,battery.battery.id,'system','info','QA legacy battery fixture',`New battery ${alias} registered successfully.`,JSON.stringify({source:'qa_synthetic',officialStatus:'not_verified'})]);expect(alert.rowCount).toBe(1);
    await pool.query('COMMIT');
  } catch(error) {await pool.query('ROLLBACK');throw error;} finally {await pool.end();}
  adminState=await admin.storageState();
  cookieState=await owner.storageState();
});
test.afterAll(async()=>{await owner?.dispose();await other?.dispose();await admin?.dispose();});
test('real registration creates a usable authenticated session',async()=>{
  const me=await owner.get('/api/auth/me');expect(me.status()).toBe(200);expect((await me.json()).email).toContain('owner-');
  const current=await rpc(owner,'auth.me');expect(current.status()).toBe(200);expect((await current.json()).result.data.json).not.toHaveProperty('passwordHash');
});
test('production registration is blocked and synthetic legacy battery is owner-readable',async()=>{
  expect(battery.bpan).toHaveLength(21);expect(battery.battery.id).toBeGreaterThan(0);
  const r=await rpc(owner,'bpan.get',{bpan:battery.bpan});expect(r.status()).toBe(200);expect((await r.json()).result.data.json.battery.bpan).toBe(battery.bpan);
  const decoded=await rpc(owner,'bpan.decode',{bpan:battery.bpan});expect(decoded.status()).toBe(200);expect((await decoded.json()).result.data.json.decoded).toMatchObject({bpan:battery.bpan,format:'legacy-project-21/read-only',legacyReadOnly:true,officialStatus:'not_verified'});
  expect((await rpc(other,'bpan.get',{bpan:battery.bpan})).status()).toBe(404);
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
  await page.context().addCookies(adminState.cookies);await page.goto('/alert-rules');
  const chemistry=page.getByRole('combobox').filter({hasText:'All chemistries'});
  await expect(chemistry).toBeVisible({timeout:20000});await chemistry.click();
  await expect(page.getByRole('option',{name:'All chemistries'})).toBeVisible();await page.getByRole('option',{name:'NMC',exact:true}).click();
  await page.getByRole('combobox').filter({hasText:'All metrics'}).click();await expect(page.getByRole('option',{name:'All metrics'})).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toContainText('Something went wrong');
});
test('ordinary users receive owner-scoped alerts without global alert requests',async({page})=>{
  const listed=await rpc(owner,'alerts.list',{limit:100});expect(listed.status()).toBe(200);
  const rows=(await listed.json()).result.data.json;
  const me=await owner.get('/api/auth/me');const identity=await me.json();
  expect(rows.length).toBeGreaterThan(0);expect(rows.every((a:any)=>a.userId===identity.id)).toBe(true);
  expect(rows.some((a:any)=>a.bpan===battery.bpan)).toBe(true);
  expect((await rpc(owner,'alerts.listAll',{limit:100})).status()).toBe(403);
  const globalRequests:string[]=[];page.on('request',r=>{if(r.url().includes('alerts.listAll'))globalRequests.push(r.url());});
  await page.context().addCookies(cookieState.cookies);await page.goto('/alerts');
  await expect(page.getByText(`New battery ${battery.bpan} registered successfully.`,{exact:true})).toBeVisible({timeout:20000});
  await expect(page.getByRole('button',{name:'Mark Read'}).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('All systems nominal');expect(globalRequests).toEqual([]);
});
test('ordinary users see explicit global-rule restriction without restricted requests',async({page})=>{
  expect((await rpc(owner,'alertRules.list',{limit:200,offset:0})).status()).toBe(403);
  const ruleRequests:string[]=[];page.on('request',r=>{if(/alertRules\.(list|getDefaults)/.test(r.url()))ruleRequests.push(r.url());});
  await page.context().addCookies(cookieState.cookies);await page.goto('/alert-rules');
  await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible({timeout:20000});
  await expect(page.getByRole('combobox').filter({hasText:'All chemistries'})).toHaveCount(0);expect(ruleRequests).toEqual([]);
});
test('public homepage fits the emulated viewport',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:/Operating System/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
});
