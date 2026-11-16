import { it, expect } from 'vitest';
import { appRouter } from './routers';
it('rejects direct unpaid marketplace purchase',async()=>{
  const caller=appRouter.createCaller({req:{} as any,res:{} as any,user:{id:1,role:'user',openId:'qa'} as any});
  await expect(caller.marketplace.purchase({listingId:1,offeredPriceInr:0})).rejects.toMatchObject({code:'FORBIDDEN'});
});
