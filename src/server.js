require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const db = require('./database/models');
const routes = require('./routes/routes');
const AuthMiddleware = require('./middleware/authMiddleware');
const socket = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/photos', express.static('photos'));
app.use('/users', AuthMiddleware.verifyUser);
app.use('/me', AuthMiddleware.verifyUser);
app.use('/events', AuthMiddleware.verifyUser);
app.use(routes);

const server = http.createServer(app);

const wss = socket.init(server);

app.locals.wss = wss;

db.sequelize.authenticate()
  .then(() => {
    server.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.log('Error connecting to database:', err));
