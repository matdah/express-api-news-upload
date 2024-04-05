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

// Skapa en Multer-instans med bara ett fält, "image"
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Array med tillåtna filtyper
    const allowedMimes = ["image/jpeg"];

    // Kontrollera om filtypen är tillåten
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true); // Acceptera filen
    } else {
      cb(new Error("Invalid file type. Only JPEG files are allowed."), false); // Avvisa filen
    }
  },
}).single("image"); // Ange 'image' som det enda tillåtna fältet för uppladdning av filer

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
  res.json({ message: "Welcome to the news API" });
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
app.post("/api/news", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const { title, content } = req.body;

    // Validera input
    let errors = [];

    // Kontrollera att bild finns i request
    if (!req.file) {
      errors.push("No image uploaded");
    }

    // Kontrollera att titel och content finns
    if (!title) {
      errors.push("title is missing");
    }
    if (!content) {
      errors.push("content is missing");
    }

    // Om det finns felmeddelanden
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Filnamn för bilden
    const image = req.file.filename;

    // Datum för lagring
    const date_posted = new Date().toISOString();

    db.run(
      "INSERT INTO news (title, content, image, date_posted) VALUES (?, ?, ?, ?)",
      [title, content, image, date_posted],
      (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        res.json({ message: "News added successfully" });
      }
    );
  });
});

// Starta server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
