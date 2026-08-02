const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const auth = require('../middleware/auth');

router.post('/:userId', auth, syncController.syncUser);
router.post('/event/:eventId', auth, syncController.syncEvent);

module.exports = router;
