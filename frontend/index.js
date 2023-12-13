const express = require('express');
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Inicia o servidor
const porta = 8080;
app.listen(porta, () => {
    console.log(`Servidor iniciado na porta ${porta}`);
});
