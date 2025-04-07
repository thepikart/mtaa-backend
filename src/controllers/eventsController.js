const db = require('../database/models');
const WebSocket = require('ws');
const fs = require('fs');


exports.getAllEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const events = await db.Event.findAll({
      include: [{ model: db.Comment }],
      limit,
      offset,
      order: [['date', 'DESC']]
    });
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};


exports.getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await db.Event.findByPk(id, {
      include: [{ model: db.Comment }]
    });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(200).json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
};


exports.createEvent = async (req, res) => {
  const { title, place, latitude, longitude, date, category, description, price } = req.body;
  const creator_id = req.user && req.user.id;

  if (!creator_id) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  var photo = null;

  if (req.file) {
    photo = req.file.destination + req.file.filename;
  }

  try {
    const event = await db.Event.create({
      title,
      place,
      latitude,
      longitude,
      date,
      category,
      description,
      price,
      photo,
      creator_id
    });

    const eventData = event.toJSON();
    // Broadcast the new event
    const wss = req.app.locals.wss;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'newEvent',
          data: eventData
        }));
      }
    });

    return res.status(201).json(eventData);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
};


exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (req.user.id !== event.creator_id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    let updatedData = { ...req.body };
    if (req.file) {
      if (event.photo && fs.existsSync(event.photo)) {
        fs.unlinkSync(event.photo);
      }
      updatedData.photo = req.file.path;
    }

    await event.update(updatedData);
    const updatedEvent = event.toJSON();

    const wss = req.app.locals.wss;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'updatedEvent',
          data: updatedEvent
        }));
      }
    });

    return res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ error: 'Failed to update event' });
  }
};


exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (req.user.id !== event.creator_id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await db.Comment.destroy({ where: { event_id: id } });

    if (event.photo && fs.existsSync(event.photo)) {
      fs.unlinkSync(event.photo);
    }

    await event.destroy();

    const wss = req.app.locals.wss;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'deletedEvent',
          data: { id }
        }));
      }
    });

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
};


exports.getEventComments = async (req, res) => {
  const { event_id } = req.params;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const event = await db.Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const comments = await db.Comment.findAll({
      where: { event_id },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching event comments:', error);
    return res.status(500).json({ error: 'Failed to fetch comments for event' });
  }
};


exports.createEventComment = async (req, res) => {
  const { event_id } = req.params;
  const user_id = req.user && req.user.id;
  const { content } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'Missing content or user not authenticated' });
  }

  try {
    const event = await db.Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const newComment = await db.Comment.create({ event_id, user_id, content });
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
  } catch (error) {
    console.error('Error creating event comment:', error);
    return res.status(500).json({ error: 'Failed to create comment for event' });
  }
};


exports.deleteEventComment = async (req, res) => {
  const { event_id, comment_id } = req.params;
  const user_id = req.user && req.user.id;
  try {
    const comment = await db.Comment.findOne({
      where: { id: comment_id, event_id }
    });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    await comment.destroy();

    const wss = req.app.locals.wss;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'deletedComment',
          data: { comment_id }
        }));
      }
    });

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Failed to delete comment for event' });
  }
};
