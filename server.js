const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.urlencoded({ extended: true }));

// Neon'dan olingan ulanish manzili (Render'ga joylaganda Environment variable'dan olinadi)
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Bulutli bazalar (Neon / Render) uchun SSL talab qilinadi
});

// Jadvalni avtomatik yaratish funksiyasi
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS talabalar (
        id SERIAL PRIMARY KEY,
        ism TEXT NOT NULL,
        guruh TEXT,
        qoshilgan TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Ma'lumotlar bazasi va talabalar jadvali muvaffaqiyatli tayyorlandi!");
  } catch (err) {
    console.error("Bazani yaratishda xatolik:", err);
  }
}

// Xavfsizlik uchun matnni tozalash funksiyasi
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

// Bosh sahifa: Ma'lumotlarni bazadan o'qib chiqarish va forma
app.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT ism, guruh FROM talabalar ORDER BY id DESC");
    const list = rows.map((r) => 
      `<li><b>${esc(r.ism)}</b> — <i>${esc(r.guruh || "Guruh ko'rsatilmagan")}</i></li>`
    ).join("");

    res.send(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Talabalar ro'yxati (Neon DB)</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; background: #f4f6f8; color: #333; }
    h1 { color: #1c4e80; }
    form { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    input { padding: 8px; margin-right: 10px; width: 40%; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 8px 16px; background: #1c4e80; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #14385d; }
    ul { background: white; padding: 20px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); list-style-type: decimal; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>Talabalar ro'yxati (Neon DB)</h1>
  <form method="POST" action="/add">
    <input name="ism" placeholder="Ism familiya" required>
    <input name="guruh" placeholder="Guruh (masalan: AI-21)">
    <button type="submit">Qo'shish</button>
  </form>
  <h2>Ro'yxat:</h2>
  <ul>${list.length > 0 ? list : "<li>Hozircha talabalar qo'shilmagan.</li>"}</ul>
</body>
</html>`);
  } catch (err) {
    console.error("Ma'lumotlarni o'qishda xato:", err);
    res.status(500).send("Serverda xatolik yuz berdi: " + err.message);
  }
});

// Yangi talaba qo'shish (POST)
app.post("/add", async (req, res) => {
  const { ism, guruh } = req.body;
  try {
    if (ism) {
      await pool.query("INSERT INTO talabalar (ism, guruh) VALUES ($1, $2)", [ism, guruh]);
    }
    res.redirect("/");
  } catch (err) {
    console.error("Ma'lumot qo'shishda xato:", err);
    res.status(500).send("Ma'lumotni saqlashda xatolik: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda muvaffaqiyatli ishga tushdi!`);
  });
});