'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const code = fs.readFileSync(__dirname + '/readiness.cjs', 'utf8');
async function check({ complete = 'false', users = [], disabled, corrupt = false, method = 'GET', url = '/healthz', reachable = true }) {
  let handler;
  const mockHttp = {
    createServer(fn) { handler = fn; return { listen(port, host) { assert.equal(port,3002); assert.equal(host,'127.0.0.1'); } }; },
    get(origin, options, callback) {
      assert.equal(origin,'http://127.0.0.1:3001/');
      const req = new EventEmitter(); req.destroy = () => {};
      queueMicrotask(() => reachable ? callback({statusCode:200,resume(){}}) : req.emit('error',new Error('synthetic')));
      return req;
    }
  };
  class Database {
    constructor(file, flags, callback) {
      assert.equal(file,'/app/data/kuma.db'); assert.equal(flags,1);
      queueMicrotask(() => callback(corrupt ? new Error('synthetic') : null));
    }
    all(query, values, callback) { assert.ok(query.startsWith('SELECT ')); callback(null,users); }
    get(query, values, callback) { assert.ok(query.startsWith('SELECT ')); assert.deepEqual(Array.from(values),['disableAuth']); callback(null,disabled === undefined ? undefined : {value:disabled}); }
    close() {}
  }
  const ctx = { process:{env:{KUMA_BOOTSTRAP_COMPLETE:complete}}, require(name) {
    if(name === 'node:http') return mockHttp;
    if(name === '/app/node_modules/@louislam/sqlite3') return {Database,OPEN_READONLY:1};
    throw new Error('unapproved module');
  }};
  vm.runInNewContext(code,ctx);
  let status; let body;
  await handler({method,url},{writeHead(code){status=code;},end(value){body=value;}});
  return {status,body};
}
(async()=>{
  assert.equal((await check({})).status,503);
  assert.equal((await check({complete:'true'})).status,503);
  assert.equal((await check({complete:'true',users:[{id:1}],disabled:'false'})).status,200);
  assert.equal((await check({complete:'true',users:[{id:1}],disabled:'true'})).status,503);
  assert.equal((await check({complete:'true',users:[{id:1}],disabled:'invalid'})).status,503);
  assert.equal((await check({complete:'true',users:[{id:1}],corrupt:true})).status,503);
  assert.equal((await check({complete:'true',users:[{id:1}],reachable:false})).status,503);
  assert.equal((await check({url:'/livez'})).status,200);
  assert.equal((await check({url:'/setup'})).status,404);
  assert.equal((await check({method:'POST'})).status,404);
  console.log('Kuma read-only readiness mocks: 10 passed');
})().catch(()=>{console.error('Kuma readiness mock failed');process.exitCode=1;});
