/**
 * seed.mjs — Circul-AI-r Platform Demo Data Seeder
 * Run: node seed.mjs
 * Safe to re-run — uses ON DUPLICATE KEY UPDATE / INSERT IGNORE.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
const connection = await mysql.createConnection(DB_URL);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

// ─── 1. USERS ─────────────────────────────────────────────────────────────────
console.log("🌱 Seeding users...");
const usersData = [
  { openId: "seed-admin-001", name: "Arjun Sharma",     email: "admin@circulair.in",       role: "admin", platformRole: "admin",          organization: "Circul-AI-r Platform" },
  { openId: "seed-oem-001",   name: "Priya Nair",       email: "oem@tatamotors.in",         role: "user",  platformRole: "oem",            organization: "Tata Motors Ltd" },
  { openId: "seed-rec-001",   name: "Vikram Mehta",     email: "ops@atterorecycling.in",    role: "user",  platformRole: "recycler",       organization: "Attero Recycling Pvt Ltd" },
  { openId: "seed-bess-001",  name: "Sunita Reddy",     email: "bess@greenenergy.in",       role: "user",  platformRole: "bess_developer", organization: "Green Energy Storage Pvt Ltd" },
  { openId: "seed-govt-001",  name: "Rajesh Kumar IAS", email: "inspector@cpcb.gov.in",     role: "user",  platformRole: "government",     organization: "CPCB – Ministry of Environment" },
  { openId: "seed-tech-001",  name: "Deepak Patel",     email: "tech@fieldops.in",          role: "user",  platformRole: "service_provider", organization: "EV Field Services India" },
];
for (const u of usersData) {
  await connection.query(
    `INSERT INTO users (openId, name, email, loginMethod, role, platformRole, organization, lastSignedIn)
     VALUES (?,?,?,?,?,?,?,NOW())
     ON DUPLICATE KEY UPDATE name=VALUES(name), platformRole=VALUES(platformRole), organization=VALUES(organization)`,
    [u.openId, u.name, u.email, "email", u.role, u.platformRole, u.organization]
  );
}
const [userRows] = await connection.query("SELECT id, openId FROM users WHERE openId LIKE 'seed-%'");
const uMap = {};
for (const u of userRows) uMap[u.openId] = u.id;
const adminId=uMap["seed-admin-001"], oemId=uMap["seed-oem-001"], recyclerId=uMap["seed-rec-001"];
const bessId=uMap["seed-bess-001"], govtId=uMap["seed-govt-001"], techId=uMap["seed-tech-001"];
console.log(`   ✓ ${usersData.length} users`);

// ─── 2. BATTERIES ─────────────────────────────────────────────────────────────
console.log("🔋 Seeding batteries...");
const mfgList = [
  {id:"HB",cc:"IN"},{id:"OK",cc:"IN"},{id:"EX",cc:"IN"},{id:"AM",cc:"IN"},
  {id:"LG",cc:"KR"},{id:"CA",cc:"CN"},{id:"PN",cc:"JP"},{id:"SU",cc:"IN"},
];
const chemList = [
  {code:"N",chem:"NMC",volt:400},{code:"L",chem:"LFP",volt:320},
  {code:"A",chem:"NCA",volt:370},{code:"C",chem:"LCO",volt:370},
  {code:"M",chem:"LMO",volt:350},
];
const capCodes = [{c:"30",n:30},{c:"48",n:48},{c:"50",n:50},{c:"60",n:60},{c:"75",n:75},{c:"80",n:80},{c:"99",n:99}];
const statuses = ["operational","operational","operational","second_life","second_life","end_of_life","in_transit","recycling"];
const batteryBpans = [];

for (let i = 0; i < 40; i++) {
  const mfg  = pick(mfgList);
  const ch   = pick(chemList);
  const capObj = pick(capCodes);
  const cap  = capObj.c;  // max 2 chars
  const capN = capObj.n;
  const volt = ch.volt >= 400 ? "40" : ch.volt >= 370 ? "37" : ch.volt >= 320 ? "32" : "28";
  const yr   = randInt(21,25);
  const mo   = String(randInt(1,12)).padStart(2,"0");
  const dy   = String(randInt(1,28)).padStart(2,"0");
  const fac  = pick(["A","B","C","D"]);
  const ser  = String(i+1).padStart(4,"0");
  const seq  = String(i+1).padStart(2,"0");
  const raw  = `${mfg.cc}${mfg.id}${cap}${ch.code}${volt}${yr}${mo}${dy}${fac}${ser}${seq}`;
  const bpan = raw.substring(0,21);
  const st   = pick(statuses);
  const soh  = st==="end_of_life" ? randFloat(55,75) : st==="second_life" ? randFloat(70,82) : randFloat(78,98);
  const cyc  = st==="end_of_life" ? randInt(1200,2000) : st==="second_life" ? randInt(600,1200) : randInt(50,600);
  const co   = pick(["IN","KR","CN","JP"]);

  await connection.query(
    `INSERT INTO batteries (bpan,countryCode,manufacturerId,capacityCode,capacityKwh,chemistryCode,chemistry,voltageCode,voltageV,cellOriginCode,cellOriginCountry,extinguisherClass,mfgYear,mfgMonth,mfgDay,factoryCode,serialNumber,recyclabilityPct,lithiumPct,cobaltPct,nickelPct,manganesePct,carbonFootprintKgCo2,status,currentSoh,cycleCount,registeredById,ownerId,vehicleId,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())
     ON DUPLICATE KEY UPDATE currentSoh=VALUES(currentSoh),cycleCount=VALUES(cycleCount),status=VALUES(status)`,
    [bpan,mfg.cc,mfg.id,cap,capN,ch.code,ch.chem,volt,ch.volt,co,pick(["India","South Korea","China","Japan"]),pick(["A","B","C"]),2000+yr,parseInt(mo),parseInt(dy),fac,ser,randFloat(85,98),randFloat(5,8),randFloat(2,15),randFloat(5,20),randFloat(3,12),randFloat(80,250),st,soh.toFixed(2),cyc,oemId,pick([oemId,recyclerId,bessId]),`VIN${String(i).padStart(10,"0")}IN`]
  );
  batteryBpans.push(bpan);
}
const [batRows] = await connection.query("SELECT id,bpan,currentSoh,cycleCount FROM batteries WHERE bpan IN (?)",[batteryBpans]);
const batMap = {};
for (const b of batRows) batMap[b.bpan]={id:b.id,soh:parseFloat(b.currentSoh||85),cyc:b.cycleCount||100};
console.log(`   ✓ ${batRows.length} batteries`);

// ─── 3. TELEMETRY (bulk) ──────────────────────────────────────────────────────
console.log("📡 Seeding telemetry readings...");
const telRows = [];
for (const bpan of batteryBpans.slice(0,20)) {
  const bat = batMap[bpan]; if(!bat) continue;
  const bv = bat.soh>85?355:bat.soh>75?340:320;
  for (let h=23;h>=0;h--) {
    const tp=randFloat(25,45), tm=tp+randFloat(1,8);
    telRows.push([bpan,bat.id,(bv+randFloat(-5,5)).toFixed(2),randFloat(-80,80).toFixed(2),(bv/100*randFloat(0.95,0.99)).toFixed(3),(bv/100*randFloat(1.01,1.05)).toFixed(3),tp.toFixed(2),tm.toFixed(2),bat.cyc+randInt(0,3),randFloat(15,35).toFixed(3),(bat.soh+randFloat(-1,1)).toFixed(2),JSON.stringify([]),tm>51?1:0,tm>51?"over_temperature":null,"simulated",hoursAgo(h)]);
  }
}
for (let i=0;i<telRows.length;i+=50) {
  const chunk=telRows.slice(i,i+50);
  const ph=chunk.map(()=>"(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
  await connection.query(`INSERT IGNORE INTO telemetry (bpan,batteryId,vPack,iPack,vMin,vMax,tPack,tMax,cycleCount,irPack,sohEstimate,dtcCodes,thermalAnomaly,anomalyType,source,recordedAt) VALUES ${ph}`,chunk.flat());
}
console.log(`   ✓ ${telRows.length} telemetry readings`);

// ─── 4. SOH PREDICTIONS ───────────────────────────────────────────────────────
console.log("🧠 Seeding SOH predictions...");
let sohCount=0;
for (const bpan of batteryBpans.slice(0,25)) {
  const bat=batMap[bpan]; if(!bat) continue;
  const ps=(bat.soh+randFloat(-2,2)).toFixed(2);
  const rul=Math.max(0,randInt(200,1500)-bat.cyc);
  const tr=bat.soh>80?"direct_reuse":bat.soh>70?pick(["module_repurposing","direct_reuse"]):pick(["module_repurposing","material_recycling"]);
  await connection.query(
    `INSERT INTO soh_predictions (bpan,batteryId,predictedSoh,rulCycles,confidence,rmse,triagePath,triageReason,maintenanceRecommendations,modelVersion,predictedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
    [bpan,bat.id,ps,rul,randFloat(92,99).toFixed(2),randFloat(0.008,0.019).toFixed(4),tr,
     `CNN-LSTM v3.2.1: SOH ${ps}%, RUL ${rul} cycles. ${tr==="direct_reuse"?"Suitable for direct EV reuse.":tr==="module_repurposing"?"Recommend BESS module repurposing.":"EOL — route to black mass extraction."}`,
     JSON.stringify(bat.soh<85?["Schedule capacity test within 30 days","Check cell balancing","Inspect thermal management system"]:["Continue standard monitoring","Next service in 90 days"]),
     "CNN-LSTM-v3.2.1"]
  );
  sohCount++;
}
console.log(`   ✓ ${sohCount} SOH predictions`);

// ─── 5. MARKETPLACE LISTINGS ──────────────────────────────────────────────────
console.log("🏪 Seeding marketplace listings...");
const ltypes=["direct_reuse","direct_reuse","module_repurposing","black_mass","second_life_pack"];
const lstats=["active","active","active","sold","reserved","expired","withdrawn"];
let mktCount=0;
for (const bpan of batteryBpans.slice(0,18)) {
  const bat=batMap[bpan]; if(!bat) continue;
  const lt=pick(ltypes), ls=pick(lstats);
  const ask=(bat.soh*randFloat(800,1200)).toFixed(2);
  const spot=(parseFloat(ask)*randFloat(0.85,1.05)).toFixed(2);
  const [br]=await connection.query("SELECT capacityKwh,chemistry FROM batteries WHERE bpan=? LIMIT 1",[bpan]);
  const cap=br[0]?.capacityKwh||50, chem=br[0]?.chemistry||"NMC";
  await connection.query(
    `INSERT INTO marketplace_listings (bpan,batteryId,sellerId,listingType,askingPriceInr,spotPriceInr,sohAtListing,rulAtListing,capacityKwh,chemistry,description,status,buyerId,transactionDate,finalPriceInr,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
    [bpan,bat.id,pick([oemId,recyclerId]),lt,ask,spot,bat.soh.toFixed(2),Math.max(0,randInt(200,1200)-bat.cyc),cap,chem,
     `${chem} ${cap}kWh — SOH ${bat.soh.toFixed(1)}%. ${lt==="direct_reuse"?"Ready for EV second-life.":lt==="module_repurposing"?"BESS module repurposing.":"Black mass extraction."}`,
     ls,ls==="sold"?bessId:null,ls==="sold"?daysAgo(randInt(1,30)):null,ls==="sold"?(parseFloat(spot)*randFloat(0.95,1.02)).toFixed(2):null]
  );
  mktCount++;
}
console.log(`   ✓ ${mktCount} marketplace listings`);

// ─── 6. LOGISTICS ─────────────────────────────────────────────────────────────
console.log("🚚 Seeding logistics orders...");
const partners=["BlueDart","DTDC","Delhivery","Ecom Express","XpressBees"];
const drivers=["Rajesh Kumar","Suresh Patel","Anita Singh","Mohan Das","Priya Verma"];
const pickups=["12 Industrial Estate, Pune","45 MIDC, Nagpur","78 Sector 18, Noida","23 Ambattur, Chennai","56 Peenya, Bangalore"];
const deliveries=["Attero Recycling, Roorkee","Eco Recyclers, Ahmedabad","Green Metals, Hyderabad","BatteryBharat, Delhi","RecycleKaro, Mumbai"];
const logStats=["pending","dispatched","in_transit","delivered","failed"];
let logCount=0;
for (const bpan of batteryBpans.slice(0,20)) {
  const bat=batMap[bpan]; if(!bat) continue;
  const st=pick(logStats), sla=pick(["24h","48h","72h"]);
  const req=daysAgo(randInt(1,30));
  const disp=st!=="pending"?new Date(req.getTime()+3600000*randInt(2,12)):null;
  const est=disp?new Date(disp.getTime()+3600000*parseInt(sla)*randInt(1,2)):null;
  const del=st==="delivered"?new Date(est.getTime()+3600000*randInt(-4,8)):null;
  const slaBr=st==="delivered"&&del&&est&&del>est?1:0;
  const sid=`SHP${String(logCount+1).padStart(4,"0")}${String(Date.now()).slice(-12)}`.substring(0,20);
  await connection.query(
    `INSERT INTO logistics (shipmentId,bpan,batteryId,requestedById,pickupAddress,deliveryAddress,pickupLat,pickupLng,deliveryLat,deliveryLng,logisticsPartner,driverName,vehicleNumber,hazmatManifestUrl,slaTier,status,requestedAt,dispatchedAt,estimatedDelivery,deliveredAt,slaBreached,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [sid,bpan,bat.id,pick([oemId,recyclerId]),pick(pickups),pick(deliveries),randFloat(8,28,6),randFloat(68,92,6),randFloat(8,28,6),randFloat(68,92,6),pick(partners),pick(drivers),`${pick(["MH","DL","KA","TN","GJ"])}${randInt(10,99)}${pick(["AB","CD","EF"])}${randInt(1000,9999)}`,`https://docs.circulair.in/hazmat/${bpan}.pdf`,sla,st,req,disp,est,del,slaBr,"Standard EV battery hazmat transport"]
  );
  logCount++;
}
console.log(`   ✓ ${logCount} logistics orders`);

// ─── 7. EPR TOKENS ────────────────────────────────────────────────────────────
console.log("🪙 Seeding EPR tokens...");
let eprCount=0;
for (const bpan of batteryBpans.slice(0,22)) {
  const bat=batMap[bpan]; if(!bat) continue;
  const [br]=await connection.query("SELECT capacityKwh FROM batteries WHERE bpan=? LIMIT 1",[bpan]);
  const cap=parseFloat(br[0]?.capacityKwh||50);
  const th=(cap*randFloat(0.8,1.2)).toFixed(3);
  const ac=(parseFloat(th)*randFloat(0.88,0.97)).toFixed(3);
  const ra=(parseFloat(ac)/parseFloat(th)).toFixed(4);
  const bm=(parseFloat(ac)*randFloat(0.6,0.75)).toFixed(3);
  const st=pick(["verified","verified","verified","pending","rejected"]);
  const tx="0x"+Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join("");
  const tid=`EPR${bpan.substring(0,6)}${Date.now().toString(36).toUpperCase()}${String(eprCount).padStart(3,"0")}`.substring(0,64);
  await connection.query(
    `INSERT INTO epr_tokens (tokenId,bpan,batteryId,recyclerId,producerId,actualYieldKg,theoreticalYieldKg,yieldRatio,blackMassKg,lithiumRecoveredKg,cobaltRecoveredKg,nickelRecoveredKg,status,blockchainTxHash,blockchainBlock,cpcbFormUrl,pliPassportUrl,verifiedAt,createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [tid,bpan,bat.id,recyclerId,oemId,ac,th,ra,bm,(parseFloat(bm)*randFloat(0.06,0.08)).toFixed(3),(parseFloat(bm)*randFloat(0.12,0.18)).toFixed(3),(parseFloat(bm)*randFloat(0.15,0.22)).toFixed(3),st,tx,randInt(1000000,9999999),`https://docs.circulair.in/cpcb/${bpan}.pdf`,`https://docs.circulair.in/pli/${bpan}.pdf`,st==="verified"?daysAgo(randInt(1,60)):null]
  );
  eprCount++;
}
console.log(`   ✓ ${eprCount} EPR tokens`);

// ─── 8. YIELD VERIFICATIONS ───────────────────────────────────────────────────
console.log("⚗️  Seeding yield verifications...");
const yBatches=[batteryBpans.slice(0,5),batteryBpans.slice(5,10),batteryBpans.slice(10,15),batteryBpans.slice(15,20)];
let yieldCount=0;
for (const batch of yBatches) {
  const bid=`BATCH${Date.now().toString(36).toUpperCase()}${yieldCount}`.substring(0,32);
  const tt=(batch.length*randFloat(40,80)).toFixed(3);
  const ta=(parseFloat(tt)*randFloat(0.88,0.96)).toFixed(3);
  const bm=(parseFloat(ta)*randFloat(0.6,0.75)).toFixed(3);
  const st=pick(["completed","completed","processing","pending"]);
  await connection.query(
    `INSERT INTO yield_verifications (batchId,recyclerId,bpanList,totalBatteriesCount,totalTheoreticalYieldKg,totalActualYieldKg,blackMassYieldKg,lithiumYieldKg,cobaltYieldKg,nickelYieldKg,processingMethod,scadaDataUrl,status,createdAt,completedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?)`,
    [bid,recyclerId,JSON.stringify(batch),batch.length,tt,ta,bm,(parseFloat(bm)*randFloat(0.06,0.08)).toFixed(3),(parseFloat(bm)*randFloat(0.12,0.18)).toFixed(3),(parseFloat(bm)*randFloat(0.15,0.22)).toFixed(3),pick(["hydrometallurgy","pyrometallurgy","direct_recycling"]),`https://scada.circulair.in/batch/${bid}`,st,st==="completed"?daysAgo(randInt(1,30)):null]
  );
  yieldCount++;
}
console.log(`   ✓ ${yieldCount} yield verifications`);

// ─── 9. ALERTS (bulk) ─────────────────────────────────────────────────────────
console.log("🔔 Seeding alerts...");
const alertDefs=[
  {type:"thermal_anomaly",sev:"critical",title:"Thermal Anomaly Detected",msg:(b)=>`Battery ${b} exceeded 51°C. Immediate inspection required.`},
  {type:"eol_detected",sev:"warning",title:"End-of-Life Battery Detected",msg:(b)=>`Battery ${b} SOH below 70%. Initiate EOL workflow.`},
  {type:"logistics_dispatch",sev:"info",title:"Shipment Dispatched",msg:(b)=>`Battery ${b} dispatched for recycling.`},
  {type:"epr_token_issued",sev:"info",title:"EPR Token Issued",msg:(b)=>`EPR token issued for ${b}. Blockchain confirmed.`},
  {type:"compliance_deadline",sev:"warning",title:"CPCB Compliance Deadline",msg:()=>"Quarterly EPR report due in 7 days."},
  {type:"soh_degradation",sev:"warning",title:"Rapid SOH Degradation",msg:(b)=>`Battery ${b} SOH dropped 3% in 30 days.`},
  {type:"sla_breach",sev:"critical",title:"SLA Breach Alert",msg:(b)=>`Logistics SLA breached for ${b}.`},
  {type:"yield_verified",sev:"info",title:"Yield Verification Complete",msg:()=>"Batch yield verified. 94.2% recovery achieved."},
  {type:"marketplace_match",sev:"info",title:"Marketplace Match Found",msg:(b)=>`Battery ${b} matched with BESS developer.`},
];
const alertData=[];
for (let i=0;i<35;i++) {
  const ad=pick(alertDefs), bpan=pick(batteryBpans), bat=batMap[bpan];
  alertData.push([pick([adminId,oemId,recyclerId,bessId,govtId]),bpan,bat?.id||null,ad.type,ad.sev,ad.title,ad.msg(bpan),JSON.stringify({source:"system",bpan}),i%3===0?1:0,i%5===0?1:0,daysAgo(randInt(0,30))]);
}
const aph=alertData.map(()=>"(?,?,?,?,?,?,?,?,?,?,?)").join(",");
await connection.query(`INSERT INTO alerts (userId,bpan,batteryId,type,severity,title,message,metadata,\`read\`,acknowledged,createdAt) VALUES ${aph}`,alertData.flat());
console.log(`   ✓ ${alertData.length} alerts`);

// ─── 10. DOCUMENTS ────────────────────────────────────────────────────────────
console.log("📄 Seeding documents...");
const dtypes=["battery_certificate","health_passport","compliance_report","recycling_manifest","hazmat_manifest","audit_trail","cpcb_form","pli_passport","material_composition"];
const docData=[];
for (let i=0;i<25;i++) {
  const bpan=pick(batteryBpans), bat=batMap[bpan], dt=pick(dtypes), up=pick([adminId,oemId,recyclerId,govtId]);
  docData.push([`${dt.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())} - ${bpan}`,dt,bpan,bat?.id||null,up,`https://docs.circulair.in/${dt}/${bpan}-${i}.pdf`,`${dt}/${bpan}-${i}.pdf`,randInt(50000,5000000),"application/pdf",pick(["public","organization","government","private"]),daysAgo(randInt(0,180))]);
}
const dph=docData.map(()=>"(?,?,?,?,?,?,?,?,?,?,?)").join(",");
await connection.query(`INSERT INTO documents (name,type,bpan,batteryId,uploadedById,fileUrl,fileKey,fileSizeBytes,mimeType,accessLevel,createdAt) VALUES ${dph}`,docData.flat());
console.log(`   ✓ ${docData.length} documents`);

// ─── 11. SERVICE HISTORY (bulk) ───────────────────────────────────────────────
console.log("🔧 Seeding service history...");
const stypes=["inspection","maintenance","repair","replacement","eol_assessment","triage"];
const techs=["Deepak Patel","Ravi Shankar","Meena Kumari","Arun Joshi","Sunita Rao"];
const cities=["Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Pune","Ahmedabad","Jaipur"];
const svcData=[];
for (const bpan of batteryBpans) {
  const bat=batMap[bpan]; if(!bat) continue;
  const n=randInt(1,3);
  for (let j=0;j<n;j++) {
    const st=pick(stypes), sd=daysAgo(randInt(1,365));
    svcData.push([bpan,bat.id,techId,st,(bat.soh+randFloat(1,5)).toFixed(2),bat.soh.toFixed(2),bat.cyc-randInt(0,50),`${st.replace(/_/g," ")} completed. ${st==="inspection"?"All cells within spec.":st==="repair"?"Replaced 2 degraded cells.":"Thermal management serviced."}`,pick(techs),pick(cities),sd,new Date(sd.getTime()+90*86400000)]);
  }
}
const sph=svcData.map(()=>"(?,?,?,?,?,?,?,?,?,?,?,?)").join(",");
await connection.query(`INSERT INTO service_history (bpan,batteryId,serviceProviderId,serviceType,sohBefore,sohAfter,cycleCountAtService,notes,technicianName,location,servicedAt,nextServiceDue) VALUES ${sph}`,svcData.flat());
console.log(`   ✓ ${svcData.length} service records`);

// ─── 12. CHAT SESSIONS ────────────────────────────────────────────────────────
console.log("💬 Seeding chat sessions...");
const chatData=[
  {uid:oemId,title:"BPAN Decoding Query",msgs:[
    {role:"user",content:"Can you decode this BPAN: INHB30N48250627000400?"},
    {role:"assistant",content:"**BPAN Decoded: INHB30N48250627000400**\n\n| Field | Value |\n|---|---|\n| Country | India (IN) |\n| Manufacturer | Himadri Batteries (HB) |\n| Capacity | 30 kWh |\n| Chemistry | NMC (N) |\n| Voltage | 48V |\n| Manufactured | June 27, 2025 |\n\nThis is a **30 kWh NMC** battery manufactured by Himadri Batteries on June 27, 2025."},
  ]},
  {uid:recyclerId,title:"SOH Threshold for Recycling",msgs:[
    {role:"user",content:"At what SOH should we route batteries to recycling vs second-life?"},
    {role:"assistant",content:"**Triage Decision Matrix:**\n- **SOH > 80%** → Direct Reuse (EV second-life, BESS)\n- **SOH 70–80%** → Module Repurposing (stationary storage)\n- **SOH < 70%** → Material Recycling (black mass extraction)\n\nThe CNN-LSTM model achieves **<2% RMSE** on SOH prediction."},
  ]},
  {uid:govtId,title:"CPCB BW-3 Form Requirements",msgs:[
    {role:"user",content:"What data is needed for the CPCB BW-3 compliance form?"},
    {role:"assistant",content:"**CPCB Form BW-3 Required Fields:**\n1. Producer Details — Name, address, EPR registration\n2. Battery Details — BPAN, chemistry, capacity, quantity\n3. Collection Data — Weight collected (kg)\n4. Recycling Data — Recycler name, CPCB authorization\n5. Material Recovery — Li, Co, Ni percentages\n6. Blockchain Reference — Hyperledger transaction hash\n\nAll fields auto-populate from the EPR Compliance module."},
  ]},
  {uid:bessId,title:"Marketplace Battery Selection",msgs:[
    {role:"user",content:"I need 500 kWh of second-life batteries for a solar BESS project."},
    {role:"assistant",content:"**Recommendations for 500 kWh Solar BESS:**\n\n**Chemistry:** LFP preferred — better thermal stability, 3000+ cycles at 80% DOD.\n\n**SOH Target:** 75–85%. At 80% SOH, you need ~625 kWh nameplate for 500 kWh usable.\n\n**Current Availability:** 18 active listings, price range ₹45,000–₹85,000/kWh, avg SOH 79.3%."},
  ]},
];
for (const chat of chatData) {
  const [sr]=await connection.query("INSERT INTO chat_sessions (userId,title,createdAt,updatedAt) VALUES (?,?,NOW(),NOW())",[chat.uid,chat.title]);
  for (const m of chat.msgs) await connection.query("INSERT INTO chat_messages (sessionId,role,content,createdAt) VALUES (?,?,?,NOW())",[sr.insertId,m.role,m.content]);
}
console.log(`   ✓ ${chatData.length} chat sessions with messages`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n✅ Seed complete! Summary:");
console.log(`   👤 ${usersData.length} users (OEM, Recycler, BESS Dev, Govt, Field Tech, Admin)`);
console.log(`   🔋 ${batRows.length} batteries (NMC/LFP/NCA/LTO, 30–100kWh)`);
console.log(`   📡 ${telRows.length} telemetry readings (24h history per battery)`);
console.log(`   🧠 ${sohCount} SOH predictions (CNN-LSTM-v3.2.1)`);
console.log(`   🏪 ${mktCount} marketplace listings`);
console.log(`   🚚 ${logCount} logistics orders`);
console.log(`   🪙 ${eprCount} EPR tokens (Hyperledger Fabric)`);
console.log(`   ⚗️  ${yieldCount} yield verifications`);
console.log(`   🔔 ${alertData.length} alerts`);
console.log(`   📄 ${docData.length} documents`);
console.log(`   🔧 ${svcData.length} service history records`);
console.log(`   💬 ${chatData.length} AI chat sessions`);
await connection.end();
