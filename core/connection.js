const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const config = require("../config");

async function startConnection() {

    const sessionPath = path.join(__dirname, "..", "session");

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });
  sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("❌ Connection closed.");

            if (shouldReconnect) {
                console.log("🔄 Reconnecting...");
                startConnection();
            } else {
                console.log("🚫 Logged out. Delete session folder to re-pair.");
            }
        }

        if (connection === "open") {
            console.log("✅ Bot connected successfully!");
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        if (msg.key.fromMe) return;

        const messageType = Object.keys(msg.message)[0];

        let body = "";

        if (messageType === "conversation") {
            body = msg.message.conversation;
        } else if (messageType === "extendedTextMessage") {
            body = msg.message.extendedTextMessage.text;
        }

        if (!body) return;

        console.log("📩 Message:", body);
    });

}

module.exports = startConnection;
