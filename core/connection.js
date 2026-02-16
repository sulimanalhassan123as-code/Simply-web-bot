const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");
const config = require("../config");

async function startConnection() {

  console.log("🚀 Starting NeverHide SuperBot...");

  // IMPORTANT: absolute path for persistent disk
  const sessionPath = path.join(process.cwd(), "session");

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["NeverHide", "Android", "10.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    emitOwnEvents: false
  });

  // 🔥 PAIR ONLY IF NOT REGISTERED
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(config.ownerNumber);
      console.log("\n📲 PAIRING CODE:", code, "\n");
    } catch (err) {
      console.log("Pairing Error:", err.message);
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Logged out. Delete session folder manually.");
      } else {
        console.log("🔄 Reconnecting...");
        setTimeout(() => startConnection(), 5000);
      }

    } else if (connection === "open") {
      console.log("✅ BOT CONNECTED SUCCESSFULLY!");
    }
  });

  // 🔥 GROUP ONLY LISTENER
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      if (!from.endsWith("@g.us")) return;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (body === ".menu") {
        await sock.sendMessage(from, {
          text: `
╭━━━〔 🌟 NEVERHIDE SUPERBOT 🌟 〕━━━╮
┃ 👑 Developer: NEVER HIDE
┃ 🤖 Stable Mode Enabled
╰━━━━━━━━━━━━━━━━━━━━━━━╯

📚 Learning
• .learn js
• .learn ai

🎮 Fun
• .joke
• .truth
• .dare

🛡 Group Tools
• .warn @user
• .tagall

More updates coming...
`
        });
      }

    } catch (err) {
      console.log("Message Error:", err.message);
    }
  });
}

module.exports = startConnection;
