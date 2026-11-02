const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// All friend routes require authentication
router.use(auth);

// Friends list & leaderboard
router.get('/', friendController.getFriends);
router.get('/leaderboard', friendController.getFriendsLeaderboard);
router.get('/requests', friendController.getFriendRequests);
router.get('/search', friendController.searchUsers);

// Request actions
router.post('/request', friendController.sendRequest);
router.post('/accept', friendController.acceptRequest);
router.post('/reject', friendController.rejectRequest);
router.delete('/:friendId', friendController.removeFriend);

// Head-to-Head Comparison
router.get('/compare/:friendId', friendController.compareWithFriend);

module.exports = router;
