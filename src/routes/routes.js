const express = require('express');
const multer = require('multer');
const router = express.Router();

const AuthController = require('../controllers/authController');
const UsersController = require('../controllers/usersController');
const EventsController = require('../controllers/eventsController');

// sets up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'photos/');
  },
  filename: (req, file, cb) => {
    if (req.url.startsWith('/users/edit')) {
      cb(null, `user_${req.user.id}_${file.originalname}`);
    } 
    else if (req.url.startsWith('/events')) {
      cb(null, `event_${Date.now()}_${file.originalname}`);
    } else {
      cb(null, `file_${Date.now()}_${file.originalname}`);
    }
  }
});

const upload = multer({ storage });

router.post('/login', AuthController.login);
router.post('/create-account', AuthController.createAccount);
router.get('/me', AuthController.getMe);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/register-push-token', AuthController.registerPushToken);

router.get('/users/bank-account', UsersController.getBankAccount);
router.put('/users/bank-account', UsersController.editBankAccount);
router.patch('/users/edit', upload.single('photo'), UsersController.editUser);
router.patch('/users/notifications', UsersController.updateNotifications);
router.get('/users/my-events', EventsController.getMyEvents);
router.get('/users/all-my-events', EventsController.getAllMyEvents);

router.get('/users/:id', UsersController.getUserProfile);
router.get('/users/:id/registered', EventsController.getUserEventsRegistered);
router.get('/users/:id/created', EventsController.getUserEventsCreated);

router.get('/users/photo/:id', UsersController.getUserPhoto);

router.get('/events/recommended', EventsController.getRecommendedEvents);
router.get('/events/near', EventsController.getEventsNearYou);
router.get('/events/search', EventsController.searchEvents);
router.get('/events/upcoming', EventsController.getUpcomingEvents);
router.get('/events', EventsController.getAllEvents);
router.get('/events/:id', EventsController.getEventById);
router.post('/events', upload.single('photo'), EventsController.createEvent);
router.put('/events/:id', upload.single('photo'), EventsController.updateEvent);
router.delete('/events/:id', EventsController.deleteEvent);
router.get('/events/:id/attendees', EventsController.getEventAttendees);

router.get('/events/category/:cat', EventsController.getEventsByCategory);

router.get('/events/:event_id/comments', EventsController.getEventComments);
router.post('/events/:event_id/comments', EventsController.createEventComment);
router.delete('/events/:event_id/comments/:comment_id', EventsController.deleteEventComment);


router.post('/events/:event_id/register', EventsController.registerForEvent);
router.delete('/events/:event_id/cancel', EventsController.cancelEventRegistration);

router.get('/events/photo/:id', EventsController.getEventPhoto);

module.exports = router;
