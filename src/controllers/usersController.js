const db = require('../database/models');
const { validationResult, checkSchema } = require('express-validator');
const { BankAccountSchema, editUserSchema, NotificationSchema } = require('../validators/usersValidator');
const fs = require('fs');


// handles user profile retrieval
// retrieves user data from db for profile page based on user id
exports.getUserProfile = async (req, res) => {
    const { id } = req.params;

    const user = await db.User.findByPk(id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            bio: user.bio,
            photo: user.photo,
        }
    });
}

// handles retrieval of user's bank account information
// retrieves bank account data from db for authenticated user
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

// handles bank account information update
// validates input data and updates bank account information in db for authenticated user, returns updated data
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

// handles user profile update
// validates input data, checks if username already exists in db, updates user information in db for authenticated user, returns updated data
exports.editUser = async (req, res) => {
    var failed = false;
    try {
        await checkSchema(editUserSchema).run(req);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            failed = true;
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        const { name, surname, username, bio } = req.body;
        const { id } = req.user;
        const user = await db.User.findByPk(id);

        if (username) {
            const usernameExists = await db.User.findOne({ where: { username } });
            if (usernameExists && usernameExists.id !== id) {
                failed = true;
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
    catch (err) {
        failed = true;
        return res.status(500).json({ message: 'Error updating user information' });
    }
    finally {
        if (failed && req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
}

// handles user notifications update
// validates input data and updates user notifications settings in db for authenticated user, returns updated data
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