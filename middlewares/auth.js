
const jwt = require('jsonwebtoken');

// middleware for token verification of admin and registered users
const verifyUser = (req, res, next) => {

    // get token
    let token = req.headers.authorization;
    // if the token is null that means user is not valid
    if (!token) return res.status(401).json({ error: 'No valid authentication' });

    token = token.split(' ')[1];
    console.log(`Inside middleware, Token is: ${token}`);

    // verify user = admin + user

    jwt.verify(token, process.env.SECRET, (err, payload) => {
        // store payload
        req.user = payload;
        console.log(`${req.user.fullName} is valid user.And, role is ${payload.role}`);
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        next();
    }
    else {
        return res.status(403).json({ error: 'Forbidden route except admin.' })
    }
};

const verifyRegisterUser = (req, res, next) => {
    if (req.user.role === 'user') {
        next();
    }
    else {
        return res.status(403).json({ error: 'Forbidden route except registered users.' })
    }
};



module.exports = {
    verifyUser,
    verifyAdmin,
    verifyRegisterUser
}