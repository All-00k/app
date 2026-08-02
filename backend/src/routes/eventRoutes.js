const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');

router.post('/', auth, eventController.createEvent);
router.get('/', auth, eventController.getEvents);
router.post('/join', auth, eventController.joinEvent);
router.get('/:id', auth, eventController.getEventById);
router.get('/:id/leaderboard', auth, eventController.getLeaderboard);
router.get('/:eventId/progress/:userId', auth, eventController.getDailyProgress);

module.exports = router;
