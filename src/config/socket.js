const { createServer } = require('https');
const { Server } = require('socket.io');
const fs = require('fs');
const app = require('../app');

const httpServer = createServer({
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem'),
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Authorization, Origin, X-Requested-With, Accept, Content-Length, X-Requested-With, X-CSRF-Token, X-XSRF-TOKEN',
    credentials: true,
    maxAge: '86400',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
});

io.on('connection', (socket) => {
  socket.on('storeClientInfo', (data) => {
    // console.log('connected custom id:', data.customId);
    socket.customId = data.customId;
  });

  socket.on('disconnect', () => {
    // console.log('disconnected custom id:', socket.customId);
  });
  socket.on('join', (data) => {
    console.log(data);
    socket.join(data);
  });
});
// io.on('connection', (socket) => {
//   socket.to('62703250618d940415cf57d1').emit('broadcast');
// });

module.exports = { io, httpServer };
