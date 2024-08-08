const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello, World');
});

app.listen(port, () => console.log("Listening on port " + port + "..."));

app.get('/api', (req, res) => {
    res.send([10, 20, 30]);
});

app.get('/reverse/:text', (req, res) => {
    res.send([...req.params.text].reverse().join(''));
});