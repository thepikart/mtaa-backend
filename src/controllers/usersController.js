const db = require('../database/models');
const { validationResult, checkSchema } = require('express-validator');
const { BankAccountSchema, editUserSchema, NotificationSchema } = require('../validators/usersValidator');
const fs = require('fs');

exports.getUserProfile = async (req, res) => {
    const { id } = req.params;

    const user = await db.User.findByPk(id, { include: [db.Event], limit: 10 });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const createdEvents = await db.Event.findAll({ where: { creator_id: id }, limit: 10 });

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            bio: user.bio,
            photo: user.photo,
        },
        createdEvents: createdEvents.map(event => ({
            id: event.id,
            title: event.title,
            place: event.place,
            date: event.date,
            description: event.description.split('. ')[0] + '.',
            photo: event.photo,
        })),
        goingToEvents: user.Events.map(event => ({
            id: event.id,
            title: event.title,
            place: event.place,
            date: event.date,
            description: event.description.split('. ')[0] + '.',
            photo: event.photo,
        }))
    });
}

exports.getBankAccount = async (req, res) => {
    const { id } = req.user;

    const bankAccount = await db.BankAccount.findOne({ where: { user_id: id } });

    if (!bankAccount) {
        return res.status(404).json({ message: 'Bank account not found' });
    }

    return res.status(200).json({
        bankAccount: {
            address: bankAccount.address,
            city: bankAccount.city,
            zip: bankAccount.zip,
            country: bankAccount.country,
            number: bankAccount.number,
        }
    });
}

exports.editBankAccount = async (req, res) => {
    await checkSchema(BankAccountSchema).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.user;
    const { address, city, zip, country, number } = req.body;

    const [bankAccount, created] = await db.BankAccount.findOrCreate({
        where: { user_id: id },
        defaults: { address, city, zip, country, number }
    });

    if (!created) {
        await bankAccount.update({ address, city, zip, country, number });
        return res.status(200).json(bankAccount);
    }
    else {
        return res.status(201).json(bankAccount);
    }
}

exports.editUser = async (req, res) => {
    await checkSchema(editUserSchema).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    
    const { name, surname, username, bio } = req.body;
    const { id } = req.user;
    const user = await db.User.findByPk(id);

    if (username) {
        const usernameExists = await db.User.findOne({ where: { username } });
        if (usernameExists && usernameExists.id !== id) {
            return res.status(400).json({ message: 'Username already exists' });
        }
    }

    var photo = user.photo;
    if (req.file) {
        if (user.photo && fs.existsSync(user.photo)) {
            fs.unlinkSync(user.photo);
        }
        photo = req.file.destination + req.file.filename;
    }

    await user.update({ name, surname, username, bio, photo });
    return res.status(200).json({
        name: user.name,
        surname: user.surname,
        username: user.username,
        bio: user.bio,
        photo: user.photo,
    });
}

exports.updateNotifications = async (req, res) => {
    await checkSchema(NotificationSchema).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.user;
    const { my_attendees, my_comments, my_time, reg_attendees, reg_comments, reg_time } = req.body;

    const userNotifications = await db.Notification.findOne({ where: { user_id: id } });

    if (!userNotifications) {
        return res.status(404).json({ message: 'Notifications not found' });
    }

    await userNotifications.update({ my_attendees, my_comments, my_time, reg_attendees, reg_comments, reg_time });

    return res.status(200).json(userNotifications);
}