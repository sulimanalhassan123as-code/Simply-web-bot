const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whisky-sockets/baileys');
const pino = require('pino');
const fs = require('fs');

// 👇👇 INSTRUCTIONS FOR USER: Change the line below to your real number! 👇👇
const myPhoneNumber = "233248503631"; 

async function startBot() {
    console.log("🟢 SYSTEM: Starting Pairing Mode...");

    // Remove old session to prevent Error 405
    if (fs.existsSync('auth_info') && !fs.existsSync('auth_info/creds.json')) {
        fs.rmSync('auth_info', { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // QR is OFF
        auth: state,
        connectTimeoutMs: 60000,
    });

    if (!sock.authState.creds.me && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                // Request Pairing Code
                // If the number is still the default XXXXX, this will fail safely.
                if (myPhoneNumber === "233XXXXXXXXX") {
                    console.log("⚠️ STOP! You forgot to add your phone number in index.js (Line 6).");
                } else {
                    const code = await sock.requestPairingCode(myPhoneNumber);
                    console.log(`\n\n📢 YOUR PAIRING CODE:  ${code?.match(/.{1,4}/g)?.join("-") || code}\n\n`);
                }
            } catch (err) {
                console.log("⚠️ Error: Could not generate code. Check phone number format!", err);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = (lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                startBot();
            } else {
                console.log("⛔ Logged out. Delete 'auth_info' folder to restart.");
            }
        } else if (connection === 'open') {
            console.log('✅ CONNECTED! You can now use the bot.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
