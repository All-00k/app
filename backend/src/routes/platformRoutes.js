const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const platformController = require('../controllers/platformController');

// Public DPI Leaderboard
router.get('/leaderboard', platformController.getDPILeaderboard);

// Authenticated platform management routes
router.use(auth);
router.get('/', platformController.getLinkedPlatforms);
router.post('/link', platformController.linkPlatform);
router.post('/sync', platformController.syncPlatforms);
router.delete('/:platform', platformController.unlinkPlatform);

module.exports = router;
