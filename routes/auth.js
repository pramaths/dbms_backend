const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/forgotpassword', userController.forgotPassword);
router.post('/resetpassword/:resetToken', userController.resetPassword);
router.post('/changepassword', userController.changePassword);
router.post('/deactivateuser/:id', userController.deactivateUser);

module.exports = router;
