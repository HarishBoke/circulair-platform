import { it, expect, vi } from 'vitest';
// Fail fast if a regression attempts any real connection; never import the app main loop.
vi.mock('pg', () => ({ Pool: class { constructor() { throw new Error('Database forbidden in offline purchase test'); } } }));
vi.mock('./stripe', () => ({
  createCheckoutSession: vi.fn(() => { throw new Error('Provider forbidden in offline purchase test'); }),
  getPaymentsByBuyerId: vi.fn(() => { throw new Error('Database forbidden in offline purchase test'); }),
}));
import { appRouter } from './routers';
it('rejects direct unpaid marketplace purchase',async()=>{
  const caller=appRouter.createCaller({req:{} as any,res:{} as any,user:{id:1,role:'user',openId:'qa'} as any});
  await expect(caller.marketplace.purchase({listingId:1,offeredPriceInr:0})).rejects.toMatchObject({code:'FORBIDDEN'});
});
