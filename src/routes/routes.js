const express = require('express');
const multer = require('multer');
const router = express.Router();

const AuthController = require('../controllers/authController');
const UsersController = require('../controllers/usersController');
const EventsController = require('../controllers/eventsController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'photos/');
  },
  filename: (req, file, cb) => {
    if (req.url === '/users/edit') {
      cb(null, `user_${req.user.id}_${file.originalname}`);
    }
  }
});
const upload = multer({ storage });

router.post('/login', AuthController.login);
router.post('/create-account', AuthController.createAccount);

router.get('/users/bank-account', UsersController.getBankAccount);
router.put('/users/bank-account', UsersController.editBankAccount);
router.get('/users/edit', UsersController.getEditUser);
router.patch('/users/edit', upload.single('photo'), UsersController.editUser);
router.get('/users/notifications', UsersController.getNotifications);
router.patch('/users/notifications', UsersController.updateNotifications);
router.get('/users/:id', UsersController.getUser);

router.get('/events', EventsController.getAllEvents);
router.get('/events/:id', EventsController.getEventById);
router.post('/events', EventsController.createEvent);
router.put('/events/:id', EventsController.updateEvent);
router.delete('/events/:id', EventsController.deleteEvent);


router.get('/events/:event_id/comments', EventsController.getEventComments);
router.post('/events/:event_id/comments', EventsController.createEventComment);

module.exports = router;
