const router = require('express').Router();
const userController = require('./userController');
const auth = require('../middleware/auth');

router.get('/captcha', userController.getCaptcha);
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/refresh', userController.refresh);

// Hierarchy & Management (Protected)
router.get('/hierarchy', auth, userController.getHierarchy);
router.get('/hierarchy/:userId', auth, userController.getFullDownline);
router.post('/change-password', auth, userController.changePassword);
router.post('/self-recharge', auth, userController.selfRecharge);
router.get('/summary', auth, userController.getSummary);
router.get('/profile', auth, userController.getProfile);

module.exports = router;