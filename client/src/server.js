const express = require('express');
const path = require('path');
const app = express();

/* 
* Express server setup for serving game files.
* Includes proper content type handling for CSS and
* serves the main game interface from public directory.
*/
app.use(express.static('public', {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Client server running on port ${PORT}`);
});