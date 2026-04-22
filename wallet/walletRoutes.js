const router = require('express').Router();
const auth = require('../middleware/auth');
const walletController = require('./walletController');

router.post('/transfer', auth, walletController.transfer);
router.get('/statement', auth, walletController.statement);

module.exports = router;