"use strict";
const fs = require("node:fs");
const path = require("node:path");
const tls = require("node:tls");
const net = require("node:net");
const Module = require("node:module");
const assert = require("node:assert/strict");
const APP = process.argv[2];
const OUT = process.argv[3];
if (!OUT || !path.isAbsolute(OUT)) { throw new Error("Supply absolute external QA output directory"); }
const allowed = new Set();
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    const a = Array.isArray(args[0]) ? args[0] : args;
    const options = typeof a[0] === "object" ? a[0] : { port: a[0], host: a[1] };
    if (options.host !== "127.0.0.1" || !allowed.has(Number(options.port))) { throw new Error("QA external network denied"); }
    return originalConnect.apply(this, args);
};
const nr = Module.createRequire(path.join(APP, "package.json"));
const Native = nr("./server/notification-providers/smtp.js");
const helper = require("./smtp-bounded.cjs");
const { patchedSource } = require("./patch-smtp.cjs");
const filename = path.join(APP, "server/notification-providers/smtp.js");
const m = new Module(filename + ".qa", module); m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
const base = m.require.bind(m); m.require = name => name === "/opt/monitoring/smtp-bounded.cjs" ? helper : base(name); m._compile(patchedSource(fs.readFileSync(filename, "utf8")), filename);
const Candidate = m.exports;
async function main() {
    assert.equal(process.env.NODE_EXTRA_CA_CERTS, undefined);
    const sockets = new Set(); let handshakes = 0;
    const server = tls.createServer({ key: fs.readFileSync(path.join(OUT, "fixtures/sink-key.pem")), cert: fs.readFileSync(path.join(OUT, "fixtures/sink-cert.pem")) }, s => { handshakes++; s.write("220 QA\r\n"); });
    server.on("tlsClientError", () => {}); server.on("connection", s => { sockets.add(s); s.on("error", () => {}); s.on("close", () => sockets.delete(s)); });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); const port = server.address().port; allowed.add(port);
    const results = [];
    try {
        for (const [Provider, label] of [[Native, "native"], [Candidate, "candidate"]]) {
            let error;
            try { await new Provider().send({ smtpHost: "127.0.0.1", smtpPort: port, smtpSecure: true, smtpIgnoreTLSError: false, smtpFrom: "qa-sender@yopmail.com", smtpTo: "aimbim@yopmail.com" }, "Local QA Testing"); }
            catch (e) { error = e; }
            assert.ok(error); assert.ok(/certificate|self.signed/i.test(error.message));
            results.push({ label, passed: true, code: error.code, message: error.message, acceptedMessages: 0 });
        }
        await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(sockets.size, 0); assert.equal(handshakes, 0);
        fs.writeFileSync(path.join(OUT, "evidence/untrusted-tls.json"), JSON.stringify({ results, sockets: sockets.size, handshakes, extraCA: false }, null, 2) + "\n");
        console.log("2/2 untrusted local TLS rejections passed; zero SMTP handshakes/data");
    } finally { for (const s of sockets) { s.destroy(); } await new Promise(resolve => server.close(resolve)); allowed.delete(port); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
