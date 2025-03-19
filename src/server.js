require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/models');
const routes = require('./routes/routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);

const PORT = 8080;

db.sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log('Error connecting to database:', err));

