import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock=vi.hoisted(()=>({ db:vi.fn(()=>{throw new Error('DB forbidden in offline integration')}), provider:vi.fn(()=>{throw new Error('Provider forbidden')}), battery:vi.fn(), yield:vi.fn(), service:vi.fn(), related:vi.fn(), detail:vi.fn(), list:vi.fn(), stats:vi.fn() }));
vi.mock('pg',()=>({ Pool:class{constructor(){throw new Error('Pool forbidden in offline integration')}} }));
vi.mock('./db.ts',async(importOriginal)=>({ ...await importOriginal<Record<string,unknown>>(),getDb:mock.db,requireOwnershipDb:vi.fn(async()=>({offline:true})),getBatteryById:mock.db,getBatteryByBpan:mock.db }));
vi.mock('./_core/llm.ts',()=>({invokeLLM:mock.provider}));
vi.mock('./storage.ts',()=>({storagePut:mock.provider,storageGet:mock.provider}));
vi.mock('./stripe.ts',()=>({createCheckoutSession:mock.provider,getPaymentsByBuyerId:mock.db}));
vi.mock('./resourceOwnership.ts',async(importOriginal)=>({ ...await importOriginal<Record<string,unknown>>(),getOwnedBattery:mock.battery,listOwnedBatteries:mock.list,getOwnedBatteryStats:mock.stats,getOwnedBatteryRelated:mock.related,getOwnedBatteryDetail:mock.detail,recordPendingOwnedYield:mock.yield,addOwnedServiceRecord:mock.service }));
import { appRouter } from './routers.ts';
const BPAN='XXABC1234567890123456';
const context={user:{id:7,role:'user',openId:'offline'} as any,req:{} as any,res:{} as any};
const caller=appRouter.createCaller(context);
const anonymous=appRouter.createCaller({...context,user:null});
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',mock.provider);mock.battery.mockImplementation(async(_db,actor,input)=>{if(actor.id!==7||input.bpan!==BPAN)throw Object.assign(new Error('Resource not found'),{code:'NOT_FOUND'});return {id:12,bpan:BPAN,ownerId:7,registeredById:42,chemistry:'LFP',capacityKwh:'2.5',mfgYear:2023,mfgMonth:4,currentSoh:'65',cycleCount:0,status:'operational'};});});
describe('integrated fail-closed central actions without DB/provider transport',()=>{
 const cases=[
  ['telemetry.ingest',{bpan:BPAN,batteryId:12,iPack:0},'PRECONDITION_FAILED'],
  ['telemetry.simulate',{bpan:BPAN,batteryId:12},'PRECONDITION_FAILED'],
  ['ai.predictSoh',{bpan:BPAN,batteryId:12},'PRECONDITION_FAILED'],
  ['marketplace.createListing',{bpan:BPAN,batteryId:12,listingType:'second_life_pack'},'FORBIDDEN'],
  ['marketplace.createCheckout',{listingId:1,offerId:2,origin:'https://offline.invalid'},'FORBIDDEN'],
  ['marketplace.purchase',{listingId:1},'FORBIDDEN'],
  ['documents.upload',{name:'offline',type:'other',fileUrl:'https://offline.invalid'},'FORBIDDEN'],
  ['documents.download',{documentId:1},'FORBIDDEN'],
  ['pdf.healthPassport',{bpan:'A'.repeat(19)},'FORBIDDEN'],
  ['triage.approve',{bpan:'A'.repeat(19),approvedRoute:'reuse',triageId:'offline'},'PRECONDITION_FAILED'],
  ['triage.bulkApprove',{decisions:[{bpan:'A'.repeat(19),approvedRoute:'reuse',triageId:'offline'}]},'PRECONDITION_FAILED'],
  ['federatedLearning.submitLocalUpdate',{localRmse:0.01,sampleCount:1},'PRECONDITION_FAILED'],
  ['agent.execute',{module:'battery',action:'register_battery',inputParams:{}},'PRECONDITION_FAILED'],
  ['agent.batchExecute',{actions:[{action:'offline',module:'battery'}]},'PRECONDITION_FAILED'],
  ['marketplace.list',{},'PRECONDITION_FAILED'],
  ['marketplace.getById',{listingId:1},'PRECONDITION_FAILED'],
  ['marketplace.getPhotos',{listingId:1},'PRECONDITION_FAILED'],
  ['assistant.chat',{sessionId:1,message:'offline'},'PRECONDITION_FAILED'],
  ['wiki.chat',{message:'offline'},'PRECONDITION_FAILED'],
  ['analytics.nlQuery',{query:'show all private battery data'},'PRECONDITION_FAILED'],
  ['logistics.requestPickup',{bpan:BPAN,pickupAddress:'offline',deliveryAddress:'offline'},'PRECONDITION_FAILED'],
  ['logistics.updateStatus',{shipmentId:'offline',status:'delivered'},'PRECONDITION_FAILED'],
  ['blockchain.anchor',{eventType:'bpan_registration',payload:{}},'PRECONDITION_FAILED'],
  ['dataSharing.grantConsent',{recipientOrgId:'offline',recipientOrgName:'offline',dataScope:['telemetry']},'PRECONDITION_FAILED'],
  ['contact.submit',{name:'Offline',email:'offline@example.invalid',message:'A valid local-only draft message'},'PRECONDITION_FAILED'],
 ] as const;
 it.each(cases)('%s rejects before any DB/provider invocation',async(path,input,code)=>{
   const [group,name]=path.split('.');await expect((caller as any)[group][name](input)).rejects.toMatchObject({code});
   expect(mock.db).not.toHaveBeenCalled();expect(mock.provider).not.toHaveBeenCalled();expect(mock.battery).not.toHaveBeenCalled();
 });
 it('SDK artifact promotion rejects without URL delivery',async()=>{await expect(caller.developerApi.getSdkDownloadUrls()).rejects.toMatchObject({code:'PRECONDITION_FAILED'});});
 it('federated status exposes no fabricated trained weights or accuracy',async()=>{const status=await caller.federatedLearning.getModelStatus();expect(status).toMatchObject({availability:'unavailable',version:null,rmse:null,participants:null});expect(mock.db).not.toHaveBeenCalled();});
 it.each(['kpis','marketStats','eprStats','monthlyActivity','sohDistribution','sohTrend','chemistryDistribution','triageDistribution','marketplaceWeekly'])('global analytics %s reject ordinary user before DB',async(name)=>{await expect((caller.analytics as any)[name]()).rejects.toMatchObject({code:'FORBIDDEN'});expect(mock.db).not.toHaveBeenCalled();});
 it('personal battery stats are retained with trusted context actor',async()=>{mock.stats.mockResolvedValue({total:1});expect(await caller.analytics.batteryStats()).toEqual({total:1});expect(mock.stats).toHaveBeenCalledWith({offline:true},{id:7,role:'user'});});
 it.each(['lookup','getByBpan','getById'])('anonymous private warranty %s denied before database',async name=>{await expect((anonymous.warranty as any)[name](name==='getById'?{id:1}:{bpan:BPAN})).rejects.toMatchObject({code:'UNAUTHORIZED'});expect(mock.db).not.toHaveBeenCalled();});
 it('service record preserves zero and canonical ownership boundary',async()=>{mock.service.mockResolvedValue({success:true});await caller.service.addRecord({bpan:BPAN,sohBefore:0,sohAfter:0,cycleCountAtService:0,serviceType:'inspection'});expect(mock.service).toHaveBeenCalledWith({offline:true},{id:7,role:'user'},{bpan:BPAN,sohBefore:0,sohAfter:0,cycleCountAtService:0,serviceType:'inspection'});});
 it('yield stays pending and never claims credit issued',async()=>{mock.yield.mockResolvedValue({status:'pending',creditIssued:false,replayed:false,yieldRatio:0,token:{id:1}});const result=await caller.epr.verifyYield({bpan:BPAN,actualYieldKg:0,theoreticalYieldKg:1});expect(result).toMatchObject({status:'pending',creditIssued:false,yieldRatio:0});expect(mock.yield.mock.calls[0].slice(0,3)).toEqual([{offline:true},{id:7,role:'user'},{bpan:BPAN,actualYieldKg:0,theoreticalYieldKg:1}]);});
 it.each(['generate','calculate','evaluate'])('numeric %s uses trusted current-owner canonical battery lookup',async action=>{if(action==='generate')await caller.digitalTwin.generate({bpan:BPAN,forecastHorizonDays:30});else if(action==='calculate')await caller.carbon.calculate({bpan:BPAN,totalEnergyKwh:0} as any);else {const result=await caller.triage.evaluate({bpan:BPAN});expect(result.decision).toMatchObject({assessmentStatus:'demo_uncalibrated',safetyAssessment:'not_assessed',autoActions:[]});}expect(mock.battery).toHaveBeenCalledWith({offline:true},{id:7,role:'user'},{bpan:BPAN});expect(mock.db).not.toHaveBeenCalled();});
 it('queue is owner-scoped and has no BPAN-derived or zero guessed chemistry/cycles',async()=>{const battery=await mock.battery({},context.user,{bpan:BPAN});mock.list.mockResolvedValue({items:[battery],total:1});const rows=await caller.triage.listQueue();expect(mock.list).toHaveBeenCalledWith({offline:true},{id:7,role:'user'},{limit:100});expect(rows[0]).toMatchObject({chemistry:'LFP',capacityKwh:2.5,cycleCount:0,approvalAvailability:'unavailable',safetyAssessment:'not_assessed'});});
});
