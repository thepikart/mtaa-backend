const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyUser = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_KEY);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Access denied' });
    }

}
