const db = require('../database/models');
const WebSocket = require('ws');
const fs = require('fs');
const { Op } = db.Sequelize;
const { PaymentSchema } = require('../validators/eventsValidator');
const { validationResult, checkSchema } = require('express-validator');
const sequelize = db.sequelize;
const admin = require('../firebase');

const allowedCategories = ['art', 'technology', 'sports', 'music', 'politics', 'other'];


/**
 * Returns a list of all events with optional pagination.
 */
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

/**
 * Retrieves a single event by its ID.
 */
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

    const response = {
      id: event.id,
      name: event.title,
      photo: event.photo,
      date: event.date,
      description: event.description,
      price: event.price,
      place: event.place,
      category: event.category,
      creator: creator
        ? {
          id: creator.id,
          name: creator.username,
          photo: creator.photo
        }
        : null
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
};

/**
 * Creates a new event, performing necessary validations and checks.
 */
exports.createEvent = async (req, res) => {
  var failed = false;
  const { title, place, latitude, longitude, date, category, description, price } = req.body;
  const creator_id = req.user && req.user.id;

  if (!creator_id) {
    failed = true;
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!title || !place || !latitude || !longitude || !date || !category || !description) {
    failed = true;
    return res.status(400).json({ error: 'All fields (title, place, latitude, longitude, date, category, description) must be provided.' });
  }

  if (!allowedCategories.includes(category.toLowerCase())) {
    failed = true;
    return res.status(400).json({ error: `Invalid category. Allowed: ${allowedCategories.join(', ')}.` });
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    failed = true;
    return res.status(400).json({ error: 'Invalid date provided.' });
  }
  if (eventDate < new Date()) {
    failed = true;
    return res.status(400).json({ error: 'Event date must be in the future.' });
  }

  if (Number(price) > 0) {
    const bankAccount = await db.BankAccount.findOne({ where: { user_id: creator_id } });
    if (!bankAccount) {
      failed = true;
      return res.status(400).json({ error: 'Paid events require a bank account. Please set up your bank account first.' });
    }
  }

  if (Number(price) < 0) {
    failed = true;
    return res.status(400).json({ error: 'Enter a valid price.' });
  }

  const duplicateEvent = await db.Event.findOne({
    where: {
      title,
      date: eventDate
    }
  });
  if (duplicateEvent) {
    failed = true;
    return res.status(400).json({ error: 'An event with the same title and date already exists.' });
  }

  const photo = req.file ? req.file.path : null;

  try {

    const event = await db.Event.create({
      title,
      place,
      latitude,
      longitude,
      date: eventDate,
      category: category.toLowerCase(),
      description,
      price,
      photo,
      creator_id
    });

    const wss = req.app.locals.wss;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'newEvent',
          data: event
        }));
      }
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    failed = true;
    return res.status(500).json({ error: 'Failed to create event' });
  }
  finally {
    if (failed && req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

/**
 * Updates an existing event, if the requestor is the creator.
 */
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  var failed = false;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) {
      failed = true;
      return res.status(404).json({ message: 'Event not found' });
    }
    if (req.user.id !== event.creator_id) {
      failed = true;
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const { title, place, latitude, longitude, date, category, description, price } = req.body;

    if (!title || !place || !latitude || !longitude || !date || !category || !description) {
      failed = true;
      return res.status(400).json({ error: 'All fields (title, place, latitude, longitude, date, category, description) must be provided.' });
    }

    if (category && !allowedCategories.includes(category.toLowerCase())) {
      failed = true;
      return res.status(400).json({ error: `Invalid category. Allowed: ${allowedCategories.join(', ')}.` });
    }

    if (date) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        failed = true;
        return res.status(400).json({ error: 'Invalid date provided.' });
      }
      if (newDate < new Date()) {
        failed = true;
        return res.status(400).json({ error: 'Event date must be in the future.' });
      }
      req.body.date = newDate;
    }

    if (title || date) {
      const titleToCheck = title || event.title;
      const dateToCheck = date || event.date;
      const duplicateEvent = await db.Event.findOne({
        where: {
          title: titleToCheck,
          date: dateToCheck,
          id: { [Op.ne]: id }
        }
      });
      if (duplicateEvent) {
        failed = true;
        return res.status(400).json({ error: 'An event with the same title and date already exists.' });
      }
    }

    if (price && Number(price) > 0) {
      const bankAccount = await db.BankAccount.findOne({ where: { user_id: req.user.id } });
      if (!bankAccount) {
        failed = true;
        return res.status(400).json({ error: 'Paid events require a bank account.' });
      }
    }
    if (price && Number(price) < 0) {
      failed = true;
      return res.status(400).json({ error: 'Enter a valid price.' });
    }

    if (req.file) {
      if (event.photo && fs.existsSync(event.photo)) {
        fs.unlinkSync(event.photo);
      }
      req.body.photo = req.file.path;
    }

    await event.update(req.body);
    const updatedEvent = event.toJSON();

    const notifBody = `The event "${title}" at "${place}" on ${date.toLocaleString("sk-SK", {
      dateStyle: "medium",
      timeStyle: "short",
    })} has been updated.`;
    await handleNotifications(id, null, null, null, 'Event Update', notifBody, 'info');

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
    failed = true;
    return res.status(500).json({ error: 'Failed to update event' });
  }
  finally {
    if (failed && req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};


/**
 * Deletes an existing event, along with its comments and registrations, if the requestor is the creator.
 */
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

    const eventData = {
      title: event.title,
      place: event.place,
      date: event.date.toLocaleString("sk-SK", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }

    await handleNotifications(id, null, null, null, 'Event Cancelled',
      `The event "${eventData.title}" at "${eventData.place}" on ${eventData.date} has been cancelled.`, 'error');

    await db.UserEvent.destroy({ where: { event_id: id } });

    await db.Comment.destroy({ where: { event_id: id } });

    if (event.photo && fs.existsSync(event.photo)) {
      fs.unlinkSync(event.photo);
    }

    await event.destroy();

    for (const msg of messages) {
      try {
        await admin.messaging().send(msg);
      }
      catch (error) {
        console.error('Error sending notification to token:', msg.token, error.message);
      }
    }

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

/**
 * Retrieves comments for a specific event, supporting pagination.
 */
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

/**
 * Creates a new comment on a specific event (limited to 150 characters).
 */
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

    await handleNotifications(event_id, event.creator_id, 'reg_comments', 'my_comments', 'New Comment',
      `New comment on "${event.title}" by ${commentData.User.username}: "${content}"`, 'info');
    
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

/**
 * Deletes a comment if the requestor is its author.
 */
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

/**
 * Fetches events created by a specific user, supporting pagination.
 */
exports.getUserEventsCreated = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const createdEvents = await db.Event.findAll({ where: { creator_id: id }, limit, offset });
    if (!createdEvents) {
      return res.status(404).json({ message: 'No events found' });
    }
    else {
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
  }
  catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user events' });
  }
};

/**
 * Fetches events a specific user is registered for, supporting pagination.
 */
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
  }
  catch (error) {
    return res.status(500).json({ error: 'Failed to fetch registered events' });
  }
};

/**
 * Retrieves events for the authenticated user—both created and registered—within a given date range.
 */
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
    }
    else {
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
  }
  catch (error) {
    return res.status(500).json({ error: 'Failed to fetch my events' });
  }
};

/**
 * Registers the user for an event, optionally requiring payment if the event has a price.
 */
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
      await checkSchema(PaymentSchema).run(req);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const user = await db.User.findByPk(id);
      await handleNotifications(event_id, event.creator_id, 'reg_attendees', 'my_attendees', 'New Attendee',
        `User ${user.username} has registered for event "${event.title}"`, 'info');

      await db.UserEvent.create({ user_id: id, event_id });

      return res.status(200).json({ message: 'Payment successful! You are now registered for the event.' });
    }
    else {
      const user = await db.User.findByPk(id);
      await handleNotifications(event_id, event.creator_id, 'reg_attendees', 'my_attendees', 'New Registration',
        `User ${user.username} has registered for event "${event.title}"`, 'info');

      await db.UserEvent.create({ user_id: id, event_id });
      return res.status(200).json({ message: 'You are now registered for the event.' });
    }
  }
  catch (error) {
    return res.status(500).json({ message: 'Failed to register for the event.' });
  }
};

/**
 * Cancels the user’s registration for an event, as long as they are not the creator.
 */
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

    const user = await db.User.findByPk(id);
    await handleNotifications(event_id, event.creator_id, 'reg_attendees', 'my_attendees', 'Registration Cancelled',
      `User ${user.username} has cancelled their registration for event "${event.title}"`, 'error');

    if (event.price > 0) {
      return res.status(200).json({ message: 'You have successfully canceled your registration for the event. A refund will be processed shortly.' });
    }
    else {
      return res.status(200).json({ message: 'You have successfully canceled your registration for the event.' });
    }
  }
  catch (error) {
    return res.status(500).json({ message: 'Failed to cancel registration.' });
  }
};

/**
 * Fetches up to 10 upcoming events (date >= today), sorted by date.
 */
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

/**
 * Fetches events by a specified category, supporting pagination.
 */
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
    console.error('Error fetching events by category:', error);
    return res.status(500).json({ error: 'Failed to fetch events by category.' });
  }
};

/**
 * Retrieves all attendees (users) registered for a specific event.
 */
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
    }));

    return res.status(200).json({ attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return res.status(500).json({ error: 'Failed to fetch attendees' });
  }
};

/**
 * Searches events by keyword(s) in title or description (case-insensitive).
 */
exports.searchEvents = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    const keywords = searchTerm.trim().split(/\s+/);

    const andConditions = keywords.map(word => ({
      [Op.or]: [
        { title: { [Op.iLike]: `%${word}%` } },
        { description: { [Op.iLike]: `%${word}%` } },
      ]
    }));
    const events = await db.Event.findAll({
      where: {
        [Op.and]: andConditions
      },
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price'],
      limit: 20,
      order: [['date', 'ASC']]
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

/**
 * Finds events near specified coordinates based on a radius in kilometers.
 */
exports.getEventsNearYou = async (req, res) => {
  try {
    const KILOMETERS_PER_DEGREE_LAT = 111;

    let { lat, lon, radius } = req.query;

    lat = parseFloat(lat);
    lon = parseFloat(lon);
    radius = parseFloat(radius) || 10;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Missing or invalid latitude/longitude'
      });
    }

    const latDelta = radius / KILOMETERS_PER_DEGREE_LAT;
    const lonDelta = radius / (KILOMETERS_PER_DEGREE_LAT * Math.cos(lat * Math.PI / 180));

    const events = await db.Event.findAll({
      where: {
        latitude: {
          [Op.between]: [lat - latDelta, lat + latDelta]
        },
        longitude: {
          [Op.between]: [lon - lonDelta, lon + lonDelta]
        }
      },
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price', 'place', 'latitude', 'longitude'],
      order: [['date', 'ASC']]
    });

    const formatted = events.map((event) => {
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
        place: event.place,
        latitude: event.latitude,
        longitude: event.longitude,
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching events near coordinates:', error);
    return res.status(500).json({ error: 'Failed to fetch nearby events' });
  }
};

/**
 * Suggests events for the user based on their most frequently attended category;
 * if none are found or the user has no history, returns random events.
 */
exports.getRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const userEvents = await db.UserEvent.findAll({
      where: { user_id: userId },
      include: [
        {
          model: db.Event,
          attributes: ['id', 'category'],
        },
      ],
    });

    if (userEvents.length === 0) {

      const fallbackEvents = await db.Event.findAll({
        attributes: ['id', 'title', 'photo', 'date', 'description', 'price', 'place'],
        limit: 10,
        order: sequelize.literal('RANDOM()'),
      });

      const simplifiedFallback = fallbackEvents.map((event) => formatEvent(event));
      return res.status(200).json(simplifiedFallback);
    }

    const categoryCount = {};
    for (const ue of userEvents) {
      const cat = ue.Event.category;
      if (!cat) continue;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    let topCategory = null;
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    }


    const userEventIds = userEvents.map(ue => ue.Event.id);

    const recommendedEvents = await db.Event.findAll({
      attributes: ['id', 'title', 'photo', 'date', 'description', 'price', 'place', 'category'],
      where: {
        category: topCategory,
        id: { [Op.notIn]: userEventIds },
      },
      limit: 10,
      order: [['date', 'ASC']],
    });

    if (recommendedEvents.length === 0) {
      const fallbackEvents = await db.Event.findAll({
        attributes: ['id', 'title', 'photo', 'date', 'description', 'price', 'place'],
        limit: 10,
        order: sequelize.literal('RANDOM()'),
      });
      const simplified = fallbackEvents.map((event) => formatEvent(event));
      return res.status(200).json(simplified);
    }

    const simplifiedRecommended = recommendedEvents.map((event) => formatEvent(event));
    return res.status(200).json(simplifiedRecommended);
  } catch (error) {
    console.error('Error fetching recommended events:', error);
    return res.status(500).json({ error: 'Failed to fetch recommended events' });
  }
};

function formatEvent(event) {
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
    place: event.place,
    category: event.category,
  };
}

exports.getEventPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.Event.findByPk(id);
    if (!event || !event.photo) {
      return res.status(404).json({ message: 'Event photo not found' });
    }

    res.sendFile(event.photo, { root: '.' });
  }
  catch (err) {
    res.status(500).json({ message: 'Error retrieving event photo' });
  }
}

exports.getAllMyEvents = async (req, res) => {
  const { id } = req.user;

  try {
    const registered = await db.UserEvent.findAll({
      where: { user_id: id },
      attributes: ['event_id']
    });

    const created = await db.Event.findAll({
      where: { creator_id: id },
      attributes: ['id']
    });

    return res.status(200).json({
      registered: registered.map((event) => event.event_id),
      created: created.map((event) => event.id)
    });
  }
  catch (error) {
    return res.status(500).json({ message: 'Failed to fetch event IDs' });
  }


};

const handleNotifications = async (event_id, creator_id, notif_type, my_notif_type, title, body, toast_type) => {
  var registeredUsers = await db.User.findAll({
    include: [
      {
        model: db.Notification,
        where: {
          push_token: { [db.Sequelize.Op.ne]: null },
          ...(notif_type && { [notif_type]: true })
        },
        required: true
      },
      {
        model: db.Event,
        through: {
          model: db.UserEvent,
          where: { event_id: event_id }
        },
        required: true
      }
    ]
  });

  if (creator_id) {
    const creator = await db.User.findByPk(creator_id, {
      include: [{
        model: db.Notification,
        where: {
          push_token: { [db.Sequelize.Op.ne]: null },
          [my_notif_type]: true
        },
        required: true
      }]
    });
    if (creator) {
      registeredUsers = [...registeredUsers, creator];
    }
  }

  const messages = registeredUsers.map((user) => ({
    token: user.Notification.push_token,
    notification: {
      title: title,
      body: body,
    },
    data: {
      type: toast_type,
      id: toast_type == "error" ? "0" : event_id,
    }
  }));

  for (const msg of messages) {
    try {
      await admin.messaging().send(msg);
    }
    catch (error) {
      console.error('Error sending notification to token:', msg.token, error.message);
    }
  }
}