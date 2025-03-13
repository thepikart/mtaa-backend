require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/models');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;

db.sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log('Error connecting to database:', err));

