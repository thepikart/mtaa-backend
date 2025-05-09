const db = require('../database/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { validationResult, checkSchema } = require('express-validator');
const { CreateAccountSchema, LoginSchema } = require('../validators/authValidator');

// handles user login
// validates input, finds user in db, checks password, generates token for authentication and returns user data and token
exports.login = async (req, res) => {
    await checkSchema(LoginSchema).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await db.User.findOne({
        where: { email },
        include: [
            { model: db.BankAccount },
            {
                model: db.Notification,
                attributes: ['my_attendees', 'my_comments', 'my_time', 'reg_attendees', 'reg_comments', 'reg_time']
            }
        ]
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    const correctPassword = await bcrypt.compare(password, user.password);

    if (!correctPassword) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
    )

    const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_REFRESH_KEY,
        { expiresIn: '14d' }
    )

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            email: user.email,
            bio: user.bio,
            photo: user.photo,
        },
        token,
        bankAccount: !!user.BankAccount,
        notifications: user.Notification,
        refreshToken,
    });
}


// handles user account creation
// validates input, checks if email and username already exist in db, hashes password
// creates user in db, creates notification for user, generates token for authentication and returns user data and token
exports.createAccount = async (req, res) => {
    await checkSchema(CreateAccountSchema).run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, surname, username, email, password } = req.body;

    const emailExists = await db.User.findOne({ where: { email } });
    const usernameExists = await db.User.findOne({ where: { username } });

    if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
    }
    if (usernameExists) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.User.create({
        name,
        surname,
        username,
        email,
        password: hashedPassword
    });

    await db.Notification.create({ user_id: user.id });

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
    )

    const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_REFRESH_KEY,
        { expiresIn: '14d' }
    )

    return res.status(201).json({
        user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            email: user.email,
            bio: user.bio,
            photo: user.photo,
        },
        token,
        refreshToken,
    });
}


// handles logged-in user data retrieval
// retrieves user data from db for authenticated user
exports.getMe = async (req, res) => {
    const { id } = req.user;

    const user = await db.User.findByPk(id, {
        attributes: ['id', 'name', 'surname', 'username', 'email', 'bio', 'photo'],
        include: [
            { model: db.BankAccount },
            {
                model: db.Notification,
                attributes: ['my_attendees', 'my_comments', 'my_time', 'reg_attendees', 'reg_comments', 'reg_time']
            }]
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            email: user.email,
            bio: user.bio,
            photo: user.photo,
        },
        bankAccount: !!user.BankAccount,
        notifications: user.Notification
    });
}

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try{
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
        const token = jwt.sign(
            { id: decoded.id, email: decoded.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        )
        console.log('Token refreshed for user:', decoded.id);
        return res.status(200).json({ token });
    }
    catch(err) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }
}

exports.registerPushToken = async (req, res) => {
    const { push_token } = req.body;
    const { id } = req.user;

    if (!push_token) {
        return res.status(400).json({ message: 'Push token is required' });
    }

    console.log('Registering push token:', push_token);
    const notification = await db.Notification.findOne({ where: { user_id: id } });

    if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.update({ push_token });

    return res.status(200).json({ message: 'Push token registered successfully' });
}