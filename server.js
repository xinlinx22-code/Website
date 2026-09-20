const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_SECRET = process.env.DATA_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATA_SECRET) {
  console.error("DATA_SECRET belum diset.");
  process.exit(1);
}

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD belum diset.");
  process.exit(1);
}

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "website.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_hash TEXT NOT NULL,
    waktu TEXT NOT NULL
  )
`);

app.use(express.urlencoded({ extended: false }));

function getVisitorIP(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function hashIP(ip) {
  return crypto
    .createHmac("sha256", DATA_SECRET)
    .update(ip)
    .digest("hex");
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.get("/", (req, res) => {
  const ip = getVisitorIP(req);
  const ipHash = hashIP(ip);
  const waktu = new Date().toISOString();

  db.prepare(`
    INSERT INTO visits (ip_hash, waktu)
    VALUES (?, ?)
  `).run(ipHash, waktu);

  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Website Pengujian</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #eef2ff, #dbeafe);
}
.container {
  width: 90%;
  max-width: 500px;
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 15px 40px rgba(0,0,0,.12);
}
h1 { margin-top: 0; }
p { color: #555; line-height: 1.6; }
.status {
  margin-top: 25px;
  padding: 15px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1d4ed8;
}
</style>
</head>
<body>
<div class="container">
<h1>🌐 Website Pengujian</h1>
<p>Selamat datang di website pengujian.</p>
<div class="status">Halaman berhasil dimuat.</div>
</div>
</body>
</html>
  `);
});

function adminAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Basic ")) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Admin Dashboard"'
    );
    return res.status(401).send("Login diperlukan.");
  }

  try {
    const encoded = authorization.split(" ")[1];
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");

    if (separator === -1) {
      return res.status(401).send("Login tidak valid.");
    }

    const username = decoded.substring(0, separator);
    const password = decoded.substring(separator + 1);

    if (username !== "admin" || password !== ADMIN_PASSWORD) {
      return res.status(401).send("Username atau password salah.");
    }

    next();
  } catch {
    return res.status(401).send("Login tidak valid.");
  }
}

app.get("/admin", adminAuth, (req, res) => {
  const data = db.prepare(`
    SELECT id, ip_hash, waktu
    FROM visits
    ORDER BY id DESC
  `).all();

  let rows = "";

  data.forEach(item => {
    rows += `
      <tr>
        <td>${escapeHTML(item.id)}</td>
        <td>${escapeHTML(item.ip_hash)}</td>
        <td>${escapeHTML(item.waktu)}</td>
      </tr>
    `;
  });

  if (!rows) {
    rows = `
      <tr>
        <td colspan="3">Belum ada data.</td>
      </tr>
    `;
  }

  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<style>
body {
  margin: 0;
  padding: 30px;
  font-family: Arial, sans-serif;
  background: #f3f4f6;
}
.container {
  max-width: 1100px;
  margin: auto;
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0,0,0,.08);
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
th, td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
  word-break: break-all;
}
th { background: #f3f4f6; }
.info { color: #666; }
@media(max-width:700px) {
  body { padding: 10px; }
  .container { padding: 15px; }
  table { font-size: 12px; }
}
</style>
</head>
<body>
<div class="container">
<h2>📊 Dashboard Pengunjung</h2>
<p class="info">
Data yang ditampilkan menggunakan HMAC-SHA256, bukan alamat IP asli.
</p>
<table>
<thead>
<tr>
<th>ID</th>
<th>IP Hash</th>
<th>Waktu UTC</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</body>
</html>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
