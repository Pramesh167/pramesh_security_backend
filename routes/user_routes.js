
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { verifyUser } = require('../middlewares/auth');
const logRequest = require('../middlewares/logRequest');  

router.route('/register')
    .get((req, res, next) => res.status(405).json({ error: "GET method is not allowed" }))
    .delete((req, res, next) => res.status(405).json({ error: "DELETE method is not allowed" }))
    .put((req, res, next) => res.status(405).json({ error: "PUT method is not allowed" }))
    .post(logRequest, userController.userRegister);

router.route('/login')
    .get((req, res, next) => res.status(405).json({ error: "GET method is not allowed" }))
    .delete((req, res, next) => res.status(405).json({ error: "DELETE method is not allowed" }))
    .put((req, res, next) => res.status(405).json({ error: "PUT method is not allowed" }))
    .post(logRequest, userController.userLogin);

router.route('/lockAccount')
    .get((req, res, next) => res.status(405).json({ error: "GET method is not allowed" }))
    .delete((req, res, next) => res.status(405).json({ error: "DELETE method is not allowed" }))
    .put((req, res, next) => res.status(405).json({ error: "PUT method is not allowed" }))
    .post(logRequest, userController.userAccountLock);

router.route('/')
    .post((req, res, next) => res.status(405).json({ error: "POST method is not allowed" }))
    .get(logRequest, verifyUser, userController.getProfile)
    .delete(logRequest, verifyUser, userController.deleteAccount)
    .put(logRequest, verifyUser, userController.updateProfile);

router.get('/passwordNeedChange', logRequest, verifyUser, userController.getPasswordExpiry);
router.put('/changePassword', logRequest, verifyUser, userController.changePassword);




router.post('/send_otp', userController.sendOtp);


module.exports = router;
