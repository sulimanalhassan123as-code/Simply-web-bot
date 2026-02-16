const http = require("http");
const startConnection = require("./core/connection");

const PORT = process.env.PORT || 3000;

// Render needs open port
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("NeverHide SuperBot Running ✅");
}).listen(PORT, () => {
  console.log("🌐 Server started on port " + PORT);
});

startConnection();
