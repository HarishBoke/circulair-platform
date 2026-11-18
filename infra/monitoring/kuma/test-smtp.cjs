"use strict";
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const tls = require("node:tls");
const Module = require("node:module");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");
const ASSETS = __dirname;
const OUT = process.argv[3];
if (!OUT || !path.isAbsolute(OUT)) { throw new Error("Supply absolute external QA output directory"); }
fs.mkdirSync(path.join(OUT, "evidence"), { recursive: true });
const APP = process.argv[2];
if (!APP) { throw new Error("Supply verified immutable Kuma /app path"); }
const allowed = new Set();
let deniedNetwork = 0;
const owned = new Set();
const origConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    const normalized = Array.isArray(args[0]) ? args[0] : args;
    const a = typeof normalized[0] === "object" ? normalized[0] : { port: normalized[0], host: normalized[1] };
    if (a.host !== "127.0.0.1" || !allowed.has(Number(a.port))) {
        deniedNetwork++;
        throw new Error("QA external/nonowned network denied");
    }
    owned.add(this);
    this.once("close", () => owned.delete(this));
    return origConnect.apply(this, args);
};
const originalTLS = tls.connect;
tls.connect = function (...args) {
    const a = args[0];
    if (!a || (!a.socket && (a.host !== "127.0.0.1" || !allowed.has(Number(a.port))))) {
        deniedNetwork++;
        throw new Error("QA external TLS denied");
    }
    return originalTLS.apply(this, args);
};
const nativeRequire = Module.createRequire(path.join(APP, "package.json"));
const nodemailer = nativeRequire("nodemailer");
const NativeSMTP = nativeRequire("./server/notification-providers/smtp.js");
const { patchedSource, guard } = require("./patch-smtp.cjs");
const helper = require("./smtp-bounded.cjs");
function loadCandidate() {
    const original = path.join(APP, "server/notification-providers/smtp.js");
    const m = new Module(original + ".qa", module);
    m.filename = original;
    m.paths = Module._nodeModulePaths(path.dirname(original));
    const builtinRequire = m.require.bind(m);
    m.require = name => name === "/opt/monitoring/smtp-bounded.cjs" ? helper : builtinRequire(name);
    m._compile(patchedSource(fs.readFileSync(original, "utf8")), original);
    return m.exports;
}
const CandidateSMTP = loadCandidate();
const cert = fs.readFileSync(path.join(OUT, "fixtures/sink-cert.pem"));
const key = fs.readFileSync(path.join(OUT, "fixtures/sink-key.pem"));
const secureContext = tls.createSecureContext({ cert, key, minVersion: "TLSv1.2" });
const results = [];
const allSinks = new Set();
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
class Sink {
    constructor(mode, implicit = false) {
        allSinks.add(this);
        this.mode = mode;
        this.implicit = implicit;
        this.events = [];
        this.sockets = new Set();
        this.timers = new Set();
        this.messages = [];
        this.active = 0;
        this.eof = 0;
        this.closeCount = 0;
        this.auth = 0;
        this.encryptedAuth = 0;
        this.encryptedData = 0;
        this.acks = 0;
        this.receivedData = 0;
    }
    track(s) {
        if (this.sockets.has(s)) { return; }
        this.sockets.add(s);
        s.on("error", error => this.events.push({ event: "socket-error", code: error.code }));
        s.on("close", () => this.sockets.delete(s));
    }
    async start() {
        this.server = this.implicit ? tls.createServer({ cert, key, minVersion: "TLSv1.2" }, s => this.accept(s)) : net.createServer(s => this.accept(s));
        this.server.on("tlsClientError", error => this.events.push({ event: "tls-client-error", code: error.code }));
        this.server.on("connection", s => this.track(s));
        await new Promise(resolve => this.server.listen(0, "127.0.0.1", resolve));
        this.port = this.server.address().port;
        allowed.add(this.port);
        return this;
    }
    accept(s) {
        this.track(s);
        this.active++;
        let closed = false;
        const ended = () => { this.eof++; this.events.push({ event: "peer-eof" }); };
        const close = () => { if (!closed) { closed = true; this.active--; this.closeCount++; } };
        s.on("end", ended);
        s.on("close", close);
        this.session(s, !!s.encrypted);
    }
    session(s, encrypted, greeting = true) {
        let buffer = "";
        let dataMode = false;
        let content = [];
        const write = line => { if (!s.destroyed) { s.write(line + "\r\n"); } };
        if (greeting && this.mode !== "greeting-stall") { write("220 local QA sink"); }
        const dataListener = chunk => {
            buffer += chunk.toString();
            while (buffer.includes("\r\n")) {
                const i = buffer.indexOf("\r\n");
                const line = buffer.slice(0, i); buffer = buffer.slice(i + 2);
                if (dataMode) {
                    if (line === ".") {
                        dataMode = false;
                        this.receivedData++;
                        if (encrypted) { this.encryptedData++; }
                        if (this.mode === "data-ack-stall") { continue; }
                        if (this.mode === "reject-data") { write("451 QA retry later"); continue; }
                        this.messages.push(content.join("\r\n"));
                        const ack = () => {
                            this.acks++;
                            this.events.push({ event: "data-250-written", encrypted });
                            write("250 2.0.0 local accepted");
                        };
                        if (this.mode === "delayed-ack") { const t = setTimeout(ack, 500); this.timers.add(t); } else { ack(); }
                        content = [];
                    } else { content.push(line); }
                    continue;
                }
                const cmd = line.split(" ")[0].toUpperCase();
                this.events.push({ event: "command", cmd, encrypted });
                if (cmd === "EHLO" || cmd === "HELO") {
                    if (this.mode === "ehlo-stall") { continue; }
                    if (this.mode === "slow-progress") {
                        write("250-local");
                        const t = setInterval(() => write("250-still progressing"), 200);
                        this.timers.add(t);
                        continue;
                    }
                    if (!encrypted && this.mode !== "no-starttls") {
                        write("250-local"); write("250 STARTTLS");
                    } else {
                        write("250-local"); write("250 AUTH PLAIN");
                    }
                } else if (cmd === "STARTTLS") {
                    if (this.mode === "no-starttls") { write("454 4.7.0 TLS unavailable"); continue; }
                    write("220 2.0.0 begin TLS");
                    if (this.mode === "tls-stall") { continue; }
                    s.removeListener("data", dataListener);
                    const wrapped = new tls.TLSSocket(s, { isServer: true, secureContext });
                    this.track(wrapped);
                    wrapped.on("end", () => { this.eof++; this.events.push({ event: "tls-peer-eof" }); });
                    this.session(wrapped, true, false);
                    return;
                } else if (cmd === "AUTH") {
                    this.auth++;
                    if (encrypted) { this.encryptedAuth++; }
                    if (this.mode === "auth-stall") { continue; }
                    write(this.mode === "reject-auth" ? "535 5.7.8 QA rejected" : "235 2.7.0 QA auth accepted");
                } else if (cmd === "MAIL" || cmd === "RCPT") { write("250 2.1.0 OK"); }
                else if (cmd === "DATA") { dataMode = true; write("354 Send data"); }
                else if (cmd === "QUIT") { write("221 Bye"); s.end(); }
                else { write("250 OK"); }
            }
        };
        s.on("data", dataListener);
    }
    async stop() {
        for (const t of this.timers) { clearInterval(t); }
        for (const s of this.sockets) { s.destroy(); }
        await new Promise(resolve => this.server.close(resolve));
        allowed.delete(this.port);
        allSinks.delete(this);
    }
    summary() {
        return { active: this.active, eof: this.eof, closed: this.closeCount, auth: this.auth, encryptedAuth: this.encryptedAuth, data: this.receivedData, encryptedData: this.encryptedData, acceptedWith250: this.acks, messages: this.messages };
    }
}
function notification(sink, extra = {}) {
    return { type: "smtp", name: "Local QA", smtpHost: "127.0.0.1", smtpPort: sink.port, smtpSecure: sink.implicit,
        smtpIgnoreTLSError: false, smtpIgnoreSTARTTLS: false, smtpUsername: "qa-sender@yopmail.com", smtpPassword: "synthetic-local-only-no-real-provider",
        smtpFrom: "qa-sender@yopmail.com", smtpTo: "aimbim@yopmail.com", smtpCC: "", smtpBCC: "", ...extra };
}
async function exercise(label, Provider, mode, extra = {}, observationMs = null, implicit = false, context = null) {
    const sink = await new Sink(mode, implicit).start();
    const n = notification(sink, extra);
    const start = performance.now();
    let settled = false;
    const operation = new Provider().send(n, context?.msg || n.name + " Testing", context?.monitor || null, context?.heartbeat || null)
        .then(value => { settled = true; return { ok: true, value }; }, error => { settled = true; return { ok: false, code: error.code, message: error.message }; });
    let observed;
    try {
        if (observationMs !== null) {
            await sleep(observationMs);
            observed = { settled, elapsedMs: Math.round(performance.now() - start), ...sink.summary() };
            // Owned QA cancellation after the observation is NOT native recovery.
            for (const s of owned) { if (s.remotePort === sink.port) { s.destroy(); } }
        }
        let safetyTimer;
        let outcome;
        try {
            outcome = await Promise.race([operation, new Promise((resolve, reject) => { safetyTimer = setTimeout(() => reject(new Error("QA finite safety ceiling")), 45000); })]);
        } finally { clearTimeout(safetyTimer); }
        const elapsedMs = Math.round(performance.now() - start);
        await sleep(100);
        const evidence = { label, mode, implicit, observed, outcome, elapsedMs, ...sink.summary(), events: sink.events };
        fs.writeFileSync(path.join(OUT, "evidence", label.replace(/[^a-z0-9]/gi, "-") + ".json"), JSON.stringify(evidence, null, 2) + "\n");
        return evidence;
    } finally { await sink.stop(); }
}
async function testcase(name, fn) {
    if (process.argv[4] === "--focused" && !(/exact-testNotification|owned-process-socket-cleanup|checksum-and-runtime-guard|external-network-failclosed/.test(name))) { return; }
    const start = performance.now();
    try {
        const evidence = await fn();
        results.push({ name, passed: true, ms: Math.round(performance.now() - start), evidence });
        console.log("PASS " + name);
    } catch (error) {
        results.push({ name, passed: false, ms: Math.round(performance.now() - start), error: error.stack });
        console.log("FAIL " + name + ": " + error.message);
    }
    fs.writeFileSync(path.join(OUT, "evidence/native-results.json"), JSON.stringify({ node: process.version, kuma: nativeRequire("./package.json").version, nodemailer: nativeRequire("nodemailer/package.json").version, deniedNetwork, results }, null, 2) + "\n");
}
const template = { customSubject: "{% if heartbeatJSON %}{% if heartbeatJSON.status == 0 %}Uptime down{% else %}Uptime up{% endif %}{% else %}Uptime test{% endif %}", customBody: "{% if heartbeatJSON %}{% if heartbeatJSON.status == 0 %}Service check down{% else %}Service check up{% endif %}{% else %}Local notifier test{% endif %}", htmlBody: false };
async function main() {
    // Fail-closed hooks themselves reject a public destination without creating a socket.
    await testcase("external-network-failclosed", async () => {
        assert.throws(() => net.createConnection({ host: "203.0.113.1", port: 587 }), /network denied/);
        assert.equal(deniedNetwork, 1);
        deniedNetwork = 0;
        return { actualExternalConnection: false };
    });
    await testcase("checksum-and-runtime-guard", async () => {
        assert.throws(() => patchedSource(fs.readFileSync(path.join(APP, "server/notification-providers/smtp.js"), "utf8") + "\n"), /mismatch/);
        const fixture = path.join(OUT, "fixtures/guard-app");
        fs.rmSync(fixture, { recursive: true, force: true });
        fs.mkdirSync(path.join(fixture, "guard-assets"), { recursive: true });
        for (const file of ["smtp-bounded.cjs", "patch-smtp.cjs"]) { fs.copyFileSync(path.join(ASSETS, file), path.join(fixture, "guard-assets", file)); }
        const fixtureGuard = require(path.join(fixture, "guard-assets/patch-smtp.cjs")).guard;
        fs.mkdirSync(path.join(fixture, "server/notification-providers"), { recursive: true });
        fs.mkdirSync(path.join(fixture, "node_modules/nodemailer/lib/smtp-transport"), { recursive: true });
        fs.mkdirSync(path.join(fixture, "node_modules/nodemailer/lib/smtp-connection"), { recursive: true });
        for (const file of ["package.json", "node_modules/nodemailer/package.json", "server/notification-providers/smtp.js", "node_modules/nodemailer/lib/smtp-transport/index.js", "node_modules/nodemailer/lib/smtp-connection/index.js"]) {
            fs.copyFileSync(path.join(APP, file), path.join(fixture, file));
        }
        fixtureGuard(fixture, true); fixtureGuard(fixture, false);
        fs.appendFileSync(path.join(fixture, "server/notification-providers/smtp.js"), "\n");
        assert.throws(() => fixtureGuard(fixture, false), /integrity mismatch/);
        return { sourceMismatchDenied: true, runtimeTamperDenied: true };
    });
    for (const [status, word] of [[0, "down"], [1, "up"], [null, "test"]]) {
        await testcase("native-" + word + "-notify-local-250", async () => {
            const context = status === null ? null : { msg: "[synthetic-name-canary] [status] sensitive-canary", monitor: { name: "synthetic-name-canary", type: "http", url: "http://127.0.0.1/private-canary" }, heartbeat: { status, msg: "sensitive-canary", timezone: "UTC", localDateTime: "2026-11-18 10:00:00" } };
            const e = await exercise("native " + word, NativeSMTP, "accept", template, null, false, context);
            assert.equal(e.outcome.ok, true); assert.equal(e.acceptedWith250, 1); assert.equal(e.encryptedAuth, 1); assert.equal(e.encryptedData, 1);
            assert.ok(e.messages[0].includes("Subject: Uptime " + word)); assert.ok(!e.messages[0].includes("canary")); assert.equal(e.active, 0);
            return e;
        });
    }
    await testcase("native-opportunistic-starttls-downgrade-confirmed", async () => {
        const e = await exercise("native plaintext", NativeSMTP, "no-starttls");
        assert.equal(e.outcome.ok, true); assert.equal(e.acceptedWith250, 1); assert.equal(e.encryptedAuth, 0); assert.equal(e.auth, 1);
        return e;
    });
    await testcase("native-injected-timeout-fields-ignored", async () => {
        const e = await exercise("native ignored fields", NativeSMTP, "ehlo-stall", { connectionTimeout: 25, greetingTimeout: 25, socketTimeout: 25, smtpSocketTimeout: 25 }, 2000);
        assert.equal(e.observed.settled, false); assert.equal(e.observed.active, 1); assert.equal(e.observed.acceptedWith250, 0);
        return e;
    });
    const parallel = [
        ["native-greeting-default-30s", async () => {
            const e = await exercise("native greeting", NativeSMTP, "greeting-stall");
            assert.equal(e.outcome.ok, false); assert.equal(e.outcome.code, "ETIMEDOUT"); assert.ok(e.elapsedMs >= 29000 && e.elapsedMs < 34000); assert.equal(e.active, 0); assert.ok(e.eof > 0);
            return e;
        }],
        ["native-no-wall-deadline-slow-progress", async () => {
            const e = await exercise("native slow progress", NativeSMTP, "slow-progress", {}, 16000);
            assert.equal(e.observed.settled, false); assert.equal(e.observed.active, 1); assert.equal(e.observed.acceptedWith250, 0);
            return e;
        }],
        ["candidate-wall-deadline-cancels-slow-progress", async () => {
            const e = await exercise("candidate wall", CandidateSMTP, "slow-progress");
            assert.equal(e.outcome.ok, false); assert.equal(e.outcome.code, "ETIMEDOUT"); assert.ok(e.elapsedMs >= 14500 && e.elapsedMs < 17000); assert.equal(e.active, 0); assert.ok(e.eof > 0 || e.closed > 0); assert.equal(e.acceptedWith250, 0);
            return e;
        }],
    ];
    await Promise.all(parallel.map(([name, fn]) => testcase(name, fn)));
    for (const mode of ["greeting-stall", "ehlo-stall", "tls-stall", "auth-stall", "data-ack-stall"]) {
        await testcase("candidate-cancels-" + mode, async () => {
            const e = await exercise("candidate " + mode, CandidateSMTP, mode);
            assert.equal(e.outcome.ok, false); assert.equal(e.outcome.code, "ETIMEDOUT"); assert.ok(e.elapsedMs < 17000); assert.equal(e.active, 0); assert.ok(e.eof > 0 || e.closed > 0); assert.equal(e.acceptedWith250, 0);
            return e;
        });
    }
    for (const mode of ["no-starttls", "reject-auth", "reject-data"]) {
        await testcase("candidate-rejects-" + mode, async () => {
            const e = await exercise("candidate " + mode, CandidateSMTP, mode);
            assert.equal(e.outcome.ok, false); assert.equal(e.acceptedWith250, 0); assert.equal(e.active, 0);
            if (mode === "no-starttls") { assert.equal(e.auth, 0); assert.equal(e.data, 0); }
            return e;
        });
    }
    await testcase("candidate-tls-bypass-config-denied", async () => {
        const e = await exercise("candidate bypass", CandidateSMTP, "accept", { smtpIgnoreTLSError: true });
        assert.equal(e.outcome.ok, false); assert.equal(e.outcome.code, "ETLS"); assert.equal(e.auth, 0); assert.equal(e.data, 0);
        return e;
    });
    for (const [status, word] of [[0, "down"], [1, "up"], [null, "test"]]) {
        await testcase("candidate-" + word + "-notify-recovery-local-250", async () => {
            const context = status === null ? null : { msg: "sensitive-canary", monitor: { name: "synthetic-name-canary", type: "http", url: "http://127.0.0.1/private-canary" }, heartbeat: { status, timezone: "UTC", localDateTime: "2026-11-18 10:00:00" } };
            const e = await exercise("candidate " + word, CandidateSMTP, "accept", template, null, false, context);
            assert.equal(e.outcome.ok, true); assert.equal(e.acceptedWith250, 1); assert.equal(e.encryptedAuth, 1); assert.equal(e.encryptedData, 1); assert.equal(e.active, 0);
            assert.ok(e.messages[0].includes("Subject: Uptime " + word)); assert.ok(!e.messages[0].includes("canary"));
            return e;
        });
    }
    await testcase("candidate-implicit-tls-local-250", async () => {
        const e = await exercise("candidate implicit", CandidateSMTP, "accept", template, null, true);
        assert.equal(e.outcome.ok, true); assert.equal(e.acceptedWith250, 1); assert.equal(e.encryptedData, 1); assert.equal(e.active, 0);
        return e;
    });
    for (const [Provider, label] of [[NativeSMTP, "native"], [CandidateSMTP, "candidate"]]) {
        await testcase(label + "-exact-testNotification-callback-ack-gating", async () => {
            const sink = await new Sink("delayed-ack").start();
            const serverSource = fs.readFileSync(path.join(APP, "server/server.js"), "utf8");
            const handlerStart = serverSource.indexOf('socket.on("testNotification",');
            const terminator = "\n        });";
            const exact = serverSource.slice(handlerStart, serverSource.indexOf(terminator, handlerStart) + terminator.length).trim();
            assert.ok(exact.endsWith("});"));
            let handler;
            const Notification = { send: (notification, msg) => new Provider().send(notification, msg) };
            vm.runInNewContext(exact, { socket: { on(event, callback) { assert.equal(event, "testNotification"); handler = callback; } }, Notification, checkLogin() {}, log: { error() {} } });
            let callback;
            const operation = handler(notification(sink, template), result => { callback = result; });
            try {
                const waitStart = performance.now();
                while (sink.receivedData === 0 && performance.now() - waitStart < 3000) { await sleep(10); }
                assert.equal(sink.receivedData, 1);
                assert.equal(sink.acks, 0); assert.equal(callback, undefined);
                await operation;
                assert.equal(callback.ok, true); assert.equal(callback.msg, "Sent Successfully."); assert.equal(sink.acks, 1);
                await sleep(100); assert.equal(sink.active, 0);
                return { exactHandlerSourceSHA256: crypto.createHash("sha256").update(exact).digest("hex"), syntheticLoginOnly: true, before250Callback: false, after250Callback: callback, ...sink.summary() };
            } finally { await sink.stop(); }
        });
    }
    await testcase("candidate-exact-testNotification-failure-callback", async () => {
        const sink = await new Sink("reject-auth").start();
        const source = fs.readFileSync(path.join(APP, "server/server.js"), "utf8");
        const start = source.indexOf('socket.on("testNotification",');
        const terminator = "\n        });";
        const exact = source.slice(start, source.indexOf(terminator, start) + terminator.length);
        let handler;
        vm.runInNewContext(exact, { socket: { on(event, cb) { handler = cb; } }, Notification: { send: (n, msg) => new CandidateSMTP().send(n, msg) }, checkLogin() {}, log: { error() {} } });
        let callback;
        try { await handler(notification(sink), result => { callback = result; }); assert.equal(callback.ok, false); assert.equal(sink.acks, 0); return { callback, ...sink.summary() }; }
        finally { await sink.stop(); }
    });
    await testcase("candidate-direct-connect-failure", async () => {
        const sink = await new Sink("accept").start(); const n = notification(sink); await sink.stop(); allowed.add(sink.port);
        const start = performance.now();
        try { await assert.rejects(new CandidateSMTP().send(n, "Local QA Testing"), error => error.code === "ECONNREFUSED"); }
        finally { allowed.delete(sink.port); }
        return { elapsedMs: Math.round(performance.now() - start), realDestination: false };
    });
    await testcase("owned-process-socket-cleanup", async () => {
        await sleep(200); assert.equal(owned.size, 0); assert.equal(allowed.size, 0); assert.equal(deniedNetwork, 0);
        return { ownedSockets: owned.size, ownedListeners: allowed.size, unexpectedExternalAttempts: deniedNetwork };
    });
    const failed = results.filter(r => !r.passed).length;
    console.log(JSON.stringify({ total: results.length, passed: results.length - failed, failed }));
    process.exitCode = failed ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { for (const sink of allSinks) { await sink.stop(); } for (const s of owned) { s.destroy(); } });
