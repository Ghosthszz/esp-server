const express = require('express');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let logs = [];
if(fs.existsSync('logs.json')){
  logs = JSON.parse(fs.readFileSync('logs.json'));
}

const PORT = 8080;
const server = app.listen(PORT, () => console.log(`Servidor HTTP na porta ${PORT}`));

const wss = new WebSocketServer({ server });
let espClients = [];

wss.on('connection', (ws, req) => {
  const ipESP = req.socket.remoteAddress.replace("::ffff:", "");
  console.log(`ESP conectada: ${ipESP}`);
  espClients.push({ ws, ip: ipESP });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if(data.event === "log"){
        logs.push(data.msg);
        fs.writeFileSync('logs.json', JSON.stringify(logs));
      }
    } catch(e){
      // Mensagem não JSON -> ignora
      console.log("Recebido WS:", message.toString());
    }
  });

  ws.on('close', () => {
    espClients = espClients.filter(c => c.ws !== ws);
    console.log(`ESP desconectada: ${ipESP}`);
  });
});

// Endpoints HTTP
app.get('/status', (req,res)=>{
  if(espClients.length > 0){
    res.json({connected: true, ip: espClients[0].ip});
  } else {
    res.json({connected: false, ip: null});
  }
});

app.get('/logs', (req,res)=>{
  res.json(logs);
});

app.post('/acionar', (req,res)=>{
  espClients.forEach(c => c.ws.send("acionar"));
  res.json({ok:true});
});

app.post('/cadastro', (req,res)=>{
  const { uid } = req.body;
  espClients.forEach(c => c.ws.send("cadastro:" + uid));
  res.json({ok:true});
});
