const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const UsersController = require('../controllers/usersController');
const EventsController = require('../controllers/eventsController');
const AuthMiddleware = require('../middleware/authMiddleware');

router.post('/login', AuthController.login);
router.post('/create-account', AuthController.createAccount);

router.get('/users/:id', AuthMiddleware.verifyUser, UsersController.getUser);

module.exports = router;