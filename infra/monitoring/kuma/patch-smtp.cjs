"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const EXPECTED = Object.freeze({
    "server/notification-providers/smtp.js": "a86769c3a0f95f078e2e0d8d754f98c7c5139142d740273db1ce0c61b4870804",
    "node_modules/nodemailer/lib/smtp-transport/index.js": "d2c7afe741f93c8021ddb7bfce3c49fa596ce2822da588e76b699d2722f7bf5d",
    "node_modules/nodemailer/lib/smtp-connection/index.js": "9d4eaf383183bf967bc6deb810869b069c1fb512e291543b76c84dacd5b6d21e",
});
const OLD_REQUIRE = 'const nodemailer = require("nodemailer");';
const NEW_REQUIRE = OLD_REQUIRE + '\nconst { sendBoundedSMTP } = require("/opt/monitoring/smtp-bounded.cjs");';
const OLD_SEND = 'let transporter = nodemailer.createTransport(config);\n        await transporter.sendMail({';
const NEW_SEND = 'await sendBoundedSMTP(nodemailer, config, {';

function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function patchedSource(source) {
    if (hash(source) !== EXPECTED["server/notification-providers/smtp.js"] ||
        source.split(OLD_REQUIRE).length !== 2 || source.split(OLD_SEND).length !== 2) {
        throw new Error("Pinned Kuma SMTP source mismatch");
    }
    return source.replace(OLD_REQUIRE, NEW_REQUIRE).replace(OLD_SEND, NEW_SEND);
}
function guard(app, install = false) {
    if (JSON.parse(fs.readFileSync(path.join(app, "package.json"))).version !== "2.5.12" ||
        JSON.parse(fs.readFileSync(path.join(app, "node_modules/nodemailer/package.json"))).version !== "7.0.13") {
        throw new Error("Pinned Kuma/Nodemailer version mismatch");
    }
    for (const [name, expected] of Object.entries(EXPECTED)) {
        if (name === "server/notification-providers/smtp.js") { continue; }
        if (hash(fs.readFileSync(path.join(app, name))) !== expected) {
            throw new Error("Pinned SMTP dependency source mismatch");
        }
    }
    const provider = path.join(app, "server/notification-providers/smtp.js");
    const helper = path.join(__dirname, "smtp-bounded.cjs");
    const stamp = path.join(__dirname, "smtp-integrity.json");
    if (install) {
        const source = patchedSource(fs.readFileSync(provider, "utf8"));
        fs.writeFileSync(provider, source);
        fs.writeFileSync(stamp, JSON.stringify({ provider: hash(source), helper: hash(fs.readFileSync(helper)) }) + "\n", { mode: 0o444 });
    } else {
        const integrity = JSON.parse(fs.readFileSync(stamp, "utf8"));
        if (hash(fs.readFileSync(provider)) !== integrity.provider || hash(fs.readFileSync(helper)) !== integrity.helper) {
            throw new Error("Bounded SMTP runtime integrity mismatch");
        }
    }
}
if (require.main === module) {
    try {
        if (process.argv[2] !== "--install" && process.argv[2] !== "--check") { throw new Error("Invalid guard mode"); }
        guard("/app", process.argv[2] === "--install");
    } catch (error) {
        console.error("Kuma bounded SMTP integrity guard failed");
        process.exitCode = 78;
    }
}
module.exports = { guard, patchedSource, EXPECTED };
