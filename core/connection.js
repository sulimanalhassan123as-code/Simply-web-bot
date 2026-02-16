const { 
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const config = require("../config");

async function startConnection() {

  console.log("🚀 Starting NeverHide SuperBot...");

  const sessionFolder = "session";

  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["NeverHide Bot", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  // 🔥 Pairing Code Mode
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(process.env.OWNER_NUMBER);
    console.log(`\n📲 PAIRING CODE: ${code}\n`);
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Logged out. Delete session folder.");
      } else {
        console.log("🔄 Reconnecting...");
        startConnection();
      }

    } else if (connection === "open") {
      console.log("✅ BOT CONNECTED SUCCESSFULLY!");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");

      if (!isGroup) return; // Only group bot

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (body === ".menu") {
        await sock.sendMessage(from, {
          text: `
╭━━━〔 🌟 NEVERHIDE SUPERBOT 🌟 〕━━━╮
┃ 👑 Developer: NEVER HIDE
┃ 🤖 Version: 1.0.0
╰━━━━━━━━━━━━━━━━━━━━━━━╯

📚 *Learning Menu*
• .learn js
• .learn ai

🎮 *Fun Menu*
• .joke
• .truth
• .dare

🛡 *Group Menu*
• .warn @user
• .kick @user
• .tagall

✨ More features coming soon...
`
        });
      }

    } catch (err) {
      console.log("Error:", err.message);
    }
  });
}

module.exports = startConnection;
