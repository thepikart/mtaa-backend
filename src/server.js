require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/models');
const routes = require('./routes/routes');
const AuthMiddleware = require('./middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/photos', express.static('photos'));
app.use('/users', AuthMiddleware.verifyUser);
app.use(routes);

db.sequelize.authenticate()
  .then(() => {
    app.listen(process.env.PORT , () => console.log(`Server running on port ${process.env.PORT}`));
  })
  .catch((err) => console.log('Error connecting to database:', err));

