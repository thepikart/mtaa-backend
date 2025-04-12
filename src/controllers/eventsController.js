
const db = require('../database/models');
const WebSocket = require('ws');
const fs = require('fs');
const { Op } = db.Sequelize;
const path = require('path');

const allowedCategories = ['art', 'technology', 'sports', 'music', 'politics', 'other'];


exports.getAllEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;


    const events = await db.Event.findAll({
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price'],
      limit,
      offset,
      order: [['date', 'DESC']],
    });

    const simplified = events.map((event) => {
      const oneSentence = event.description
        ? event.description.split('. ')[0] + '.'
        : '';

      return {
        id: event.id,
        name: event.title,
        photo: event.photo,
        date: event.date,
        price: event.price,
        description: oneSentence,
      };
    });

    return res.status(200).json(simplified);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};



exports.getEventById = async (req, res) => {
  const { id } = req.params;
  try {

    const event = await db.Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const creator = await db.User.findByPk(event.creator_id, {
      attributes: ['id', 'photo', 'username']
    });

    const comments = await db.Comment.findAll({
      where: { event_id: id }
    });

    const oneSentence = event.description
      ? event.description.split('. ')[0] + '.'
      : '';

    const response = {
      id: event.id,
      name: event.title,
      photo: event.photo,
      date: event.date,
      description: oneSentence,
      price: event.price,
      creator: creator
        ? {
            id: creator.id,
            name: creator.username,
            photo: creator.photo
          }
        : null,
      comments: comments || []
    };

    return res.status(200).json(response);
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
  
  let photoPath = null;
  if (req.file) {
    photoPath = req.file.path;
  }
  
  try {

    const event = await db.Event.create({
      title, place, latitude, longitude, date, category, description, price,
      photo: photoPath,
      creator_id
    });
    

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newFilename = `${event.id}_photo${ext}`;
      const newFilePath = path.join(req.file.destination, newFilename);
      fs.renameSync(req.file.path, newFilePath);
      await event.update({ photo: newFilePath });
    }
    
    const eventData = event.toJSON();
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

      const ext = path.extname(req.file.originalname);
      const newFilename = `${event.id}_photo${ext}`;
      const newFilePath = path.join(req.file.destination, newFilename);
      
      if (event.photo && fs.existsSync(event.photo)) {
        fs.unlinkSync(event.photo);
      }
      
      fs.renameSync(req.file.path, newFilePath);

      updatedData.photo = newFilePath;
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

    await db.UserEvent.destroy({ where: { event_id: id } });

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
      include: [{
        model: db.User,
        attributes: ['id', 'photo', 'username']
      }],
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
  
  if (content.length > 150) {
    return res.status(400).json({ error: 'Comment must be 150 characters or less' });
  }
  
  try {
    const event = await db.Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const newComment = await db.Comment.create({ event_id, user_id, content });

    const commentData = await db.Comment.findByPk(newComment.id, {
      include: [{
        model: db.User,
        attributes: ['id', 'photo', 'username']
      }]
    });

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


exports.getUserEventsCreated = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const createdEvents = await db.Event.findAll({ where: { creator_id: id }, limit, offset });
    if (!createdEvents) {
      return res.status(404).json({ message: 'No events found' });
    } else {
      return res.status(200).json({
        createdEvents: createdEvents.map(event => ({
          id: event.id,
          title: event.title,
          place: event.place,
          date: event.date,
          description: event.description ? event.description.split('. ')[0] + '.' : '',
          photo: event.photo,
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching user created events:', error);
    return res.status(500).json({ error: 'Failed to fetch user events' });
  }
};

exports.getUserEventsRegistered = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const registeredEvents = await db.UserEvent.findAll({
      where: { user_id: id },
      limit,
      offset,
      include: [{ model: db.Event }]
    });

    if (!registeredEvents) {
      return res.status(404).json({ message: 'No events found' });
    }
    return res.status(200).json({
      registeredEvents: registeredEvents.map(event => ({
        id: event.Event.id,
        title: event.Event.title,
        place: event.Event.place,
        date: event.Event.date,
        description: event.Event.description ? event.Event.description.split('. ')[0] + '.' : '',
        photo: event.Event.photo,
      }))
    });
  } catch (error) {
    console.error('Error fetching registered events:', error);
    return res.status(500).json({ error: 'Failed to fetch registered events' });
  }
};


exports.getMyEvents = async (req, res) => {
  const { id } = req.user;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  const dateRange = { [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)] };

  try {
    const registeredEvents = await db.UserEvent.findAll({
      where: { user_id: id },
      include: [{ model: db.Event, where: { date: dateRange } }]
    });

    const createdEvents = await db.Event.findAll({
      where: { creator_id: id, date: dateRange }
    });

    if (!registeredEvents && !createdEvents) {
      return res.status(404).json({ message: 'No events found' });
    } else {
      const formatEvent = (event, creator) => ({
        id: event.id,
        title: event.title,
        place: event.place,
        date: event.date,
        description: event.description ? event.description.split('. ')[0] + '.' : '',
        photo: event.photo,
        creator: creator,
      });

      const events = [
        ...registeredEvents.map(({ Event }) => formatEvent(Event, false)),
        ...createdEvents.map(event => formatEvent(event, true)),
      ];
      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      return res.status(200).json({ events });
    }
  } catch (error) {
    console.error('Error fetching my events:', error);
    return res.status(500).json({ error: 'Failed to fetch my events' });
  }
};


exports.registerForEvent = async (req, res) => {
  const { id } = req.user;
  const { event_id } = req.params;

  try {
    const event = await db.Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.creator_id === id) {
      return res.status(400).json({ message: 'You are the creator of this event' });
    }
    const registration = await db.UserEvent.findOne({ where: { user_id: id, event_id } });
    if (registration) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }
    if (event.price > 0) {

      await db.UserEvent.create({ user_id: id, event_id });
      return res.status(200).json({ message: 'Payment successful! You are now registered for the event.' });
    } else {
      await db.UserEvent.create({ user_id: id, event_id });
      return res.status(200).json({ message: 'You are now registered for the event.' });
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    return res.status(500).json({ message: 'Failed to register for the event.' });
  }
};


exports.cancelEventRegistration = async (req, res) => {
  const { id } = req.user;
  const { event_id } = req.params;

  try {
    const event = await db.Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.creator_id === id) {
      return res.status(400).json({ message: 'As the creator of this event, you cannot cancel your registration. You can delete the event instead.' });
    }
    const registration = await db.UserEvent.findOne({ where: { user_id: id, event_id } });
    if (!registration) {
      return res.status(404).json({ message: 'You are not registered for this event' });
    }
    await registration.destroy();
    if (event.price > 0) {
      return res.status(200).json({ message: 'You have successfully canceled your registration for the event. A refund will be processed shortly.' });
    } else {
      return res.status(200).json({ message: 'You have successfully canceled your registration for the event.' });
    }
  } catch (error) {
    console.error('Error canceling event registration:', error);
    return res.status(500).json({ message: 'Failed to cancel registration.' });
  }
};


exports.getUpcomingEvents = async (req, res) => {
  try {
    const today = new Date();

    const events = await db.Event.findAll({
      where: {
        date: { [Op.gte]: today },
      },
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price'],
      limit: 10,
      order: [['date', 'ASC']],
    });


    const simplified = events.map((event) => {
      const oneSentence = event.description
        ? event.description.split('. ')[0] + '.'
        : '';
      return {
        id: event.id,
        name: event.title,
        photo: event.photo,
        date: event.date,
        price: event.price,
        description: oneSentence,
      };
    });

    return res.status(200).json(simplified);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming events.' });
  }
};

exports.getEventsByCategory = async (req, res) => {
  try {
    const { cat } = req.params;

    const allowedCategories = ['art', 'technology', 'sports', 'music', 'politics', 'other'];
    if (!allowedCategories.includes(cat)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;


    const events = await db.Event.findAll({
      where: { category: cat },
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price'],
      limit,
      offset,
      order: [['date', 'DESC']],
    });
    const simplified = events.map((event) => {
      const oneSentence = event.description
        ? event.description.split('. ')[0] + '.'
        : '';
      return {
        id: event.id,
        name: event.title,
        photo: event.photo,
        date: event.date,
        price: event.price,
        description: oneSentence,
      };
    });

    return res.status(200).json(simplified);
  } catch (error) {
    console.error('Error fetching events by category:', error);
    return res.status(500).json({ error: 'Failed to fetch events by category.' });
  }
};


exports.getEventAttendees = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await db.Event.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const userEvents = await db.UserEvent.findAll({
      where: { event_id: id },
      include: [
        {
          model: db.User,
          attributes: ['id', 'username', 'photo'],
        },
      ],
    });

    const attendees = userEvents.map((ue) => ({
      userId: ue.User.id,
      username: ue.User.username,
      photo: ue.User.photo,
      paid: ue.paid,
    }));

    return res.status(200).json({ attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return res.status(500).json({ error: 'Failed to fetch attendees' });
  }
};

exports.searchEvents = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    const keywords = searchTerm.trim().split(/\s+/);

    const andConditions = keywords.map(word => ({
      [Op.or]: [
        { title:       { [Op.iLike]: `%${word}%` } },
        { description: { [Op.iLike]: `%${word}%` } },
      ]
    }));
    const events = await db.Event.findAll({
      where: {
        [Op.and]: andConditions
      },
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price'],
      limit: 20,
      order: [['date', 'DESC']]
    });

    const simplified = events.map(event => {
      const oneSentence = event.description
        ? event.description.split('. ')[0] + '.'
        : '';
      return {
        id: event.id,
        name: event.title,
        photo: event.photo,
        date: event.date,
        price: event.price,
        description: oneSentence
      };
    });

    return res.status(200).json(simplified);
  } catch (error) {
    console.error('Error searching events:', error);
    return res.status(500).json({ error: 'Failed to search events' });
  }
};
