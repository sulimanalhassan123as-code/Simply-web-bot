require("dotenv").config();
const http = require("http");
const startConnection = require("./core/connection");

const PORT = process.env.PORT || 3000;

// Health server (Render requires open port)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("NeverHide SuperBot is running ✅");
}).listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

startConnection();
