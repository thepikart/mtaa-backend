
const { Comment } = require('../database/models');

const CommentsController = {
  // GET
  async getAllComments(req, res) {
    try {
      const comments = await Comment.findAll();
      return res.status(200).json(comments);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // POST
  async createComment(req, res) {
    try {
      const { user_id, event_id, content } = req.body;

      if (!user_id || !event_id || !content) {
        return res.status(400).json({ error: 'Missing user_id, event_id, or content' });
      }

      const newComment = await Comment.create({
        user_id,
        event_id,
        content
      });

      return res.status(201).json(newComment);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
  }
};

module.exports = CommentsController;
