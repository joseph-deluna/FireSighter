// backend/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.userId).select('-password');

            next();
        } catch (error) {
            console.error(error);
            res.status(401).send('Not authorized');
        }
    }

    if (!token) {
        res.status(401).send('Not authorized, no token');
    }
};
