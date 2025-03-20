const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const UsersController = require('../controllers/usersController');
const EventsController = require('../controllers/eventsController');

router.post('/login', AuthController.login);
router.post('/create-account', AuthController.createAccount);

router.get('/users/bank-account', UsersController.getBankAccount);
router.put('/users/bank-account', UsersController.editBankAccount);

router.get('/users/:id', UsersController.getUser);


module.exports = router;