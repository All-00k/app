const assert = require('assert');
const { getTierInfo } = require('./src/utils/tier');
const { calculateScore } = require('./src/leetcode');

console.log('🧪 Running Backend Unit Tests for CI...\n');

// 1. Test Score Calculation
console.log('👉 [1] Testing Delta Score Calculation:');
const score = calculateScore(5, 3, 2);
// 5*1 + 3*3 + 2*5 = 5 + 9 + 10 = 24
assert.strictEqual(score, 24, 'Score calculation should match easy*1 + med*3 + hard*5');
console.log('   ✅ Score calculation verified (5 Easy, 3 Med, 2 Hard = 24 pts)\n');

// 2. Test Tier Ranks
console.log('👉 [2] Testing Tier Calculation Boundaries:');
const novice = getTierInfo(0);
assert.strictEqual(novice.tier, 'Novice Coder');

const warrior = getTierInfo(50);
assert.strictEqual(warrior.tier, 'Code Warrior');

const master = getTierInfo(200);
assert.strictEqual(master.tier, 'Algo Master');

const architect = getTierInfo(500);
assert.strictEqual(architect.tier, 'Elite Architect');

const grandmaster = getTierInfo(1000);
assert.strictEqual(grandmaster.tier, 'Grandmaster');
console.log('   ✅ All 5 tier ranks verified (Novice -> Grandmaster)\n');

// 3. Test Routes & Server Syntax Integrity
console.log('👉 [3] Verifying Controller & Route Module Imports:');
require('./src/routes/authRoutes');
require('./src/routes/eventRoutes');
require('./src/routes/rankingRoutes');
require('./src/routes/syncRoutes');
require('./src/routes/notificationRoutes');
require('./src/routes/friendRoutes');
require('./src/routes/platformRoutes');
console.log('   ✅ All route modules loaded with zero syntax errors\n');

console.log('🎉 ALL BACKEND CI UNIT TESTS PASSED!');
