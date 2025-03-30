const db = require('../database/models');
const WebSocket = require('ws');
const fs = require('fs');


exports.getAllEvents = async (req, res) => {
    try {
      const events = await db.Event.findAll({
        include: [{ model: db.Comment }]
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
    const { title, place, latitude, longitude, date, category, description, price, photo, creator_id } = req.body;

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
      return res.status(201).json(event);
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
      await event.update(req.body);
      return res.status(200).json(event);
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
      
      
      await event.destroy();
      return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({ error: 'Failed to delete event' });
    }
};
  



//comenty


exports.getEventComments = async (req, res) => {
  const { event_id } = req.params;
  try {
    const comments = await db.Comment.findAll({ where: { event_id } });
    return res.status(200).json(comments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch comments for event' });
  }
};


exports.createEventComment = async (req, res) => {
  const { event_id } = req.params;
  const { user_id, content } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'Missing user_id or content' });
  }

  try {
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
    console.error(error);
    return res.status(500).json({ error: 'Failed to create comment for event' });
  }
};
