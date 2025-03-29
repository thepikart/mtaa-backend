const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const router = express.Router();

const AuthController = require('../controllers/authController');
const UsersController = require('../controllers/usersController');
const EventsController = require('../controllers/eventsController');
const CommentsController = require('../controllers/commentsController');
const { Comment } = require('../database/models');

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

router.get('/comments', CommentsController.getAllComments);


router.post('/comments', async (req, res) => {
  try {
    const { user_id, event_id, content } = req.body;
    if (!user_id || !event_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newComment = await Comment.create({ user_id, event_id, content });
    
    const commentData = newComment.toJSON();

    const wss = req.app.locals.wss;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'newComment',
          data: commentData
        }));
      }
    });

    return res.status(201).json(commentData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

module.exports = router;
