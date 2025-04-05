const db = require('../database/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { validationResult, checkSchema } = require('express-validator');
const { CreateAccountSchema } = require('../validators/authValidator');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await db.User.findOne({ 
        where: { email },
        include: [{ model: db.BankAccount }]
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
        bankAccount: user.BankAccount ? true : false
    });
}

exports.createAccount = async (req, res) => {
    await Promise.all(checkSchema(CreateAccountSchema).map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid value' });
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
        token
    });
}

exports.getMe = async (req, res) => {
    const { id } = req.user;

    const user = await db.User.findByPk(id, {
        attributes: ['id', 'name', 'surname', 'username', 'email', 'bio', 'photo'],
        include: [{model: db.BankAccount}]
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
        user: user,
        bankAccount: user.BankAccount ? true : false
    });
}