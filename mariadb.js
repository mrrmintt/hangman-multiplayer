// Hauptdatei, z.B. index.js
const mariadb = require('mariadb');
const dbConfig = require('./dbConfig');  // Hier wird die dbConfig-Datei eingebunden

// Verbindungspool erstellen
const pool = mariadb.createPool(dbConfig);

async function connectToDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Erfolgreich mit der Datenbank verbunden!');
    // Hier kannst du SQL-Abfragen ausführen
  } catch (err) {
    console.error('Fehler bei der Verbindung zur Datenbank:', err);
  } finally {
    if (conn) conn.end(); // Verbindung schließen
  }
}

connectToDatabase();
