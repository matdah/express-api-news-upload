/**
 * API för nyheter (titel, content, image, date_posted)
 * med Express, SQLite3 och Multer.
 */
const express = require("express");
const sqlite3 = require("sqlite3");
const multer = require("multer");
const app = express();
const port = 3000;

// Multer inställingar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Statiska filer
app.use(express.static("public"));

// Middleware för att kunna använda JSON
app.use(express.json());

// Skapa en databasanslutning
const db = new sqlite3.Database("db/news.db", (err) => {
  if (err) {
    console.error("Error opening database " + err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(
      "CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY, title TEXT, content TEXT, image TEXT, date_posted TEXT)"
    );
  }
});

app.get("/api", (req, res) => {
  res.send("Hello World!");
});

// Hämta alla nyheter
app.get("/api/news", (req, res) => {
  db.all("SELECT * FROM news", (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    // Lägg till full path till bild
    rows = rows.map((row) => {
      return {
        ...row,
        image: `http://localhost:${port}/images/${row.image}`,
      };
    });
    res.json(rows);
  });
});

// Hämta en nyhet
app.get("/api/news/:id", (req, res) => {
  db.get("SELECT * FROM news WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    // Lägg till full path till bild
    row = {
      ...row,
      image: `http://localhost:${port}/images/${row.image}`,
    };
    res.json(row);
  });
});

// Lägg till en nyhet
app.post(
  "/api/news",
  multer({ storage: storage }).single("image"),
  (req, res) => {
    const { title, content } = req.body;

    // Kontrolla att bild finns i request
    if (!req.file) {
      res.status(400).json({ error: "Image is required" });
      return;
    }
    const image = req.file.filename;

    // Validera input
    if (!title || !content) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    // Datum för lagring
    const date_posted = new Date().toISOString();

    db.run(
      "INSERT INTO news (title, content, image, date_posted) VALUES (?, ?, ?, ?)",
      [title, content, image, date_posted],
      (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({ message: "News added successfully" });
      }
    );
  }
);

// Starta server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
