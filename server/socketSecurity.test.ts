import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, type Server } from 'http';
import { io as connect, type Socket } from 'socket.io-client';
import type { Server as IoServer } from 'socket.io';
vi.mock('./_core/auth', () => ({ authenticateRequest: vi.fn() }));
vi.mock('./db', () => ({ getBatteryByBpan: vi.fn() }));
vi.mock('./batterySimulator', () => ({ startBatterySimulator: vi.fn(), stopAllSimulators: vi.fn(), getSimulatorStats: vi.fn().mockReturnValue([]) }));
import { authenticateRequest } from './_core/auth';
import { getBatteryByBpan } from './db';
import { startBatterySimulator } from './batterySimulator';
import { attachTelemetrySocket } from './telemetrySocket';
let server: Server, io: IoServer, url: string;
const sockets: Socket[]=[];
const BPAN='INMH1C3FKOIND5COA0001';
beforeEach(async()=>{
  vi.clearAllMocks();
  vi.mocked(authenticateRequest).mockImplementation(async req => req.headers.cookie === 'qa=owner' ? {id:1,role:'user'} as any : null);
  vi.mocked(getBatteryByBpan).mockResolvedValue({id:1,bpan:BPAN,ownerId:1,registeredById:1} as any);
  server=createServer(); io=attachTelemetrySocket(server);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  url=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async()=>{sockets.splice(0).forEach(s=>s.disconnect());await new Promise<void>(resolve=>io.close(()=>resolve()));});
function client(cookie?: string,origin?: string){const s=connect(`${url}/telemetry`,{path:'/api/socket.io',transports:['websocket'],reconnection:false,forceNew:true,autoConnect:false,extraHeaders:{...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})}});sockets.push(s);return s;}
function event<T=any>(s:Socket,name:string):Promise<T>{return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Timed out awaiting ${name}`)),2500);s.once(name,data=>{clearTimeout(timer);resolve(data);});});}
async function owner(){const s=client('qa=owner');const ready=event(s,'connect');s.connect();await ready;return s;}
describe('Realtime security boundaries',()=>{
  it('rejects anonymous socket handshakes',async()=>{const s=client();const p=event<Error>(s,'connect_error');s.connect();expect((await p).message).toBe('Unauthorized');});
  it('rejects hostile origins even with a valid session',async()=>{const s=client('qa=owner','https://attacker.invalid');const p=event<Error>(s,'connect_error');s.connect();expect((await p).message).toBe('Forbidden origin');});
  it('permits an owned battery subscription without starting a simulator',async()=>{const s=await owner();const p=event(s,'telemetry:status');s.emit('subscribe',{bpan:BPAN});expect(await p).toMatchObject({bpan:BPAN,connected:true});expect(startBatterySimulator).not.toHaveBeenCalled();});
  it('rejects another account battery',async()=>{vi.mocked(getBatteryByBpan).mockResolvedValue({id:2,bpan:BPAN,ownerId:2,registeredById:2} as any);const s=await owner();const p=event(s,'telemetry:error');s.emit('subscribe',{bpan:BPAN});expect(await p).toMatchObject({message:'Battery access denied'});});
  it('handles malformed subscriptions without crashing',async()=>{const s=await owner();const p=event(s,'telemetry:error');s.emit('subscribe',null);expect(await p).toMatchObject({message:'Invalid BPAN'});});
  it('rejects browser ingest rather than falsely acknowledging persistence',async()=>{const s=await owner();const p=event(s,'ingest:error');s.emit('ingest',{bpan:BPAN,tMax:99});expect((await p).message).toContain('authenticated REST');});
});
