const express = require('express');
const path = require('path');
const app = express();

// Statische Dateien aus dem public Ordner servieren
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Client server running on port ${PORT}`);
});