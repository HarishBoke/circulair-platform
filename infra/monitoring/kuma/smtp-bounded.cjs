"use strict";

const net = require("node:net");

// Fixed service policy, deliberately not notification JSON or environment knobs.
const LIMITS = Object.freeze({
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    dnsTimeout: 5000,
    transactionTimeout: 15000,
});

/** Native Nodemailer SMTP only; no proxy, queue, retry, provider or extra service. */
async function sendBoundedSMTP(nodemailer, config, mail) {
    if (config.ignoreTLS || config.tls?.rejectUnauthorized === false) {
        throw Object.assign(new Error("SMTP requires verified TLS"), { code: "ETLS" });
    }
    let socket;
    let transporter;
    let expired = false;
    let connectTimer;
    let deadlineTimer;
    const options = {
        ...config,
        connectionTimeout: LIMITS.connectionTimeout,
        greetingTimeout: LIMITS.greetingTimeout,
        socketTimeout: LIMITS.socketTimeout,
        dnsTimeout: LIMITS.dnsTimeout,
        requireTLS: !config.secure,
        tls: { ...config.tls, rejectUnauthorized: true, minVersion: "TLSv1.2", servername: net.isIP(config.host) ? undefined : config.host },
        getSocket(opts, callback) {
            if (expired) {
                callback(Object.assign(new Error("SMTP transaction deadline exceeded"), { code: "ETIMEDOUT" }));
                return;
            }
            // This is the native direct TCP connection, NOT a relay or proxy.
            // Owning it permits cancellation even during DNS/TCP/TLS/protocol I/O.
            socket = net.createConnection({ host: opts.host, port: Number(opts.port) });
            let handedOff = false;
            function finish(error) {
                if (handedOff) {
                    return;
                }
                handedOff = true;
                clearTimeout(connectTimer);
                socket.removeListener("connect", connected);
                socket.removeListener("error", failed);
                if (error || expired) {
                    socket.destroy();
                    callback(error || Object.assign(new Error("SMTP transaction deadline exceeded"), { code: "ETIMEDOUT" }));
                } else {
                    callback(null, { connection: socket });
                }
            }
            function connected() { finish(); }
            function failed(error) { finish(error); }
            socket.once("connect", connected);
            socket.once("error", failed);
            connectTimer = setTimeout(() => {
                finish(Object.assign(new Error("SMTP connection deadline exceeded"), { code: "ETIMEDOUT" }));
            }, LIMITS.connectionTimeout);
        },
    };
    try {
        const deadline = new Promise((resolve, reject) => {
            deadlineTimer = setTimeout(() => {
                expired = true;
                // Destroy before rejecting: timeout is cancellation, not only Promise.race.
                if (socket) {
                    socket.destroy();
                }
                reject(Object.assign(new Error("SMTP transaction deadline exceeded"), { code: "ETIMEDOUT" }));
            }, LIMITS.transactionTimeout);
        });
        transporter = nodemailer.createTransport(options);
        // Promise.race installs a rejection observer on the native operation too.
        return await Promise.race([transporter.sendMail(mail), deadline]);
    } finally {
        expired = true;
        clearTimeout(connectTimer);
        clearTimeout(deadlineTimer);
        if (socket) {
            socket.destroy();
        }
        if (transporter) {
            transporter.close();
        }
    }
}

module.exports = { sendBoundedSMTP, LIMITS };
