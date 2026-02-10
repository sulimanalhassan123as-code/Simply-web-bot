const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whisky-sockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    console.log("🟢 SYSTEM: Starting Bot...");
    
    // 1. Load Session Data
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // 2. Create the Connection
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Keep the logs clean
        printQRInTerminal: true, // Show QR in the console
        auth: state,
        browser: ["iPhone Bot", "Safari", "1.0"], // Identify as iPhone
        connectTimeoutMs: 60000,
    });

    // 3. Handle Connection Events (The "Self-Healing" Part)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Force small QR for mobile screens
            qrcode.generate(qr, { small: true });
            console.log("\n⚠️ SCAN THIS QR CODE NOW!");
        }

        if (connection === 'close') {
            const reason = (lastDisconnect?.error)?.output?.statusCode;
            console.log(`🔴 Connection Closed. Reason: ${reason}`);
            
            // Reconnect unless logged out
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Auto-Restarting...");
                startBot();
            } else {
                console.log("⛔ You are logged out. Delete the 'auth_info' folder and restart to scan again.");
            }
        } else if (connection === 'open') {
            console.log('✅ CONNECTED! Send "!ping" to test.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 4. Simple Commands
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const type = Object.keys(msg.message)[0];
            const body = (type === 'conversation') ? msg.message.conversation :
                         (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : '';

            // Test Command
            if (body.toLowerCase() === '!ping') {
                await sock.sendMessage(from, { text: 'Pong! 🏓 I am alive.' });
            }
             // Hello Command
             if (body.toLowerCase() === 'hi') {
                await sock.sendMessage(from, { text: 'Hello! I am your new WhatsApp Bot.' });
            }

        } catch (err) {
            console.log("Error handling message:", err);
        }
    });
}

startBot();
          
