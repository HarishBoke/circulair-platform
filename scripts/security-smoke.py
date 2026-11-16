#!/usr/bin/env python3
"""Low-impact authorized checks. No successful mutations, brute-force, or data export."""
import argparse, json, time
from urllib.parse import urlparse
import requests

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    parsed=urlparse(args.base)
    if parsed.hostname not in {'circulair.energy','localhost','127.0.0.1'} or parsed.username or parsed.password:
        raise SystemExit('Target is outside this assessment allowlist')
    cases=[
      ('homepage','GET','/',None,None,{200}),
      ('database readiness','GET','/api/health',None,None,{200}),
      ('REST session auth','GET','/api/auth/me',None,None,{401}),
      ('invalid cookie','GET','/api/auth/me',None,{'Cookie':'app_session=invalid'}, {401}),
      ('REST battery auth','GET','/api/v1/batteries',None,None,{401}),
      ('REST invalid key','GET','/api/v1/batteries',None,{'Authorization':'Bearer invalid-qa-key'}, {401}),
      ('tRPC anonymous identity','GET','/api/trpc/auth.me',None,None,{200}),
      ('tRPC protected registry','GET','/api/trpc/bpan.list?input=%7B%22json%22%3A%7B%7D%7D',None,None,{401}),
      ('tRPC admin protection','GET','/api/trpc/admin.roleStats',None,None,{403}),
      ('MCP auth','POST','/api/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},None,{401}),
      ('unsigned Stripe rejection','POST','/api/stripe/webhook',{'type':'qa-invalid'},None,{400}),
      ('bootstrap missing secret','POST','/api/admin/bootstrap-admin',{},None,{403}),
      ('malformed login','POST','/api/auth/login',{'email':{},'password':'not-a-valid-account'},None,{400}),
      ('malformed registration','POST','/api/auth/register',{'email':{},'password':'not-a-valid-account'},None,{400}),
    ]
    results=[]
    for label,method,path,data,headers,expected in cases:
      try:
        r=requests.request(method,args.base.rstrip('/')+path,json=data,headers=headers,timeout=20,allow_redirects=False)
        record={'check':label,'status':r.status_code,'expected':sorted(expected),'passed':r.status_code in expected,'seconds':round(r.elapsed.total_seconds(),3)}
        if label=='database readiness':record['health']=r.json();record['passed'] &= record['health'].get('db')=='connected'
        if label=='tRPC anonymous identity':record['passed'] &= r.json().get('result',{}).get('data',{}).get('json') is None
        if label=='homepage':record['security_headers']={k:r.headers.get(k) for k in ['strict-transport-security','x-content-type-options','x-frame-options']}
      except Exception as e:record={'check':label,'passed':False,'error':type(e).__name__}
      results.append(record);print(json.dumps(record));time.sleep(0.7)
    report={'base':args.base,'passed':sum(x['passed'] for x in results),'total':len(results),'results':results}
    with open(args.output,'w') as f:json.dump(report,f,indent=2)
    return 0 if report['passed']==report['total'] else 1
if __name__=='__main__':raise SystemExit(main())
