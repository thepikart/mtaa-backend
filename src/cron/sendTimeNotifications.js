const cron = require('node-cron');
const admin = require('../firebase');
const db = require('../database/models');
const e = require('express');

cron.schedule('1 0 * * *', async () => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const inThreeDays = new Date(today);
    inThreeDays.setUTCDate(today.getUTCDate() + 3);
    inThreeDays.setUTCHours(23, 59, 59, 999);

    const events = await db.Event.findAll({
      where: {
        date: {
          [db.Sequelize.Op.between]: [today, inThreeDays]
        },
      },
      attributes: ['id'],
    });

    var registeredUsers = await db.User.findAll({
      include: [
        {
          model: db.Notification,
          where: {
            push_token: { [db.Sequelize.Op.ne]: null },
            reg_time: true
          },
          required: true
        },
        {
          model: db.Event,
          attributes: ['id', 'title', 'place', 'date'],
          through: {
            model: db.UserEvent,
            where: { event_id: events.map(event => event.id) },
          },
          required: true
        }
      ]
    });

    const messages = [];

    for (const user of registeredUsers) {
      const token = user?.Notification?.push_token;
      for (const event of user.Events) {
        const dateString = event.date.toLocaleString("sk-SK", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const message = {
          token: token,
          notification: {
            title: 'Event Reminder',
            body: `Your event: "${event.title}" is scheduled on ${dateString} at ${event.place}.`,
          },
          data: {
            type: "success",
            id: String(event.id),
          }
        };
        messages.push(message);
      }
    }

    for (const msg of messages) {
      try {
        await admin.messaging().send(msg);
      }
      catch (error) {
        console.error('Failed to send notification:', msg.token, error.message);
      }
    }
  }
  catch (error) {
    console.error('Error sending notifications:', error);
  }
});

cron.schedule('1 0 * * *', async () => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const inThreeDays = new Date(today);
    inThreeDays.setUTCDate(today.getUTCDate() + 3);
    inThreeDays.setUTCHours(23, 59, 59, 999);

    const events = await db.Event.findAll({
      where: {
        date: {
          [db.Sequelize.Op.between]: [today, inThreeDays]
        }
      },
      include: [
        {
          model: db.User,
          foreignKey: 'creator_id',
          include: [
            {
              model: db.Notification,
              where: {
                push_token: { [db.Sequelize.Op.ne]: null },
                my_time: true
              },
              required: true
            }
          ]
        }
      ]
    });

    const messages = [];

    for (const event of events) {
      const creator = event.User;
      const token = creator?.Notification?.push_token;
      if (token) {
        const dateString = event.date.toLocaleString("sk-SK", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const message = {
          token: token,
          notification: {
            title: 'Event Reminder',
            body: `Your event: "${event.title}" is scheduled on ${dateString} at ${event.place}.`,
          },
          data: {
            type: "success",
            id: String(event.id),
          }
        };
        messages.push(message);
      }
    }

    for (const msg of messages) {
      try {
        await admin.messaging().send(msg);
      }
      catch (error) {
        console.error('Failed to send notification:', msg.token, error.message);
      }
    }
  }
  catch (error) {
    console.error('Error sending notifications:', error);
  }
});