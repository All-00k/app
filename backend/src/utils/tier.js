function getTierInfo(score) {
  if (score >= 1000) return { tier: 'Grandmaster', badge: '👑', minScore: 1000, nextScore: 2500, color: '#8B5CF6' };
  if (score >= 500) return { tier: 'Elite Architect', badge: '💎', minScore: 500, nextScore: 1000, color: '#3B82F6' };
  if (score >= 200) return { tier: 'Algo Master', badge: '🥇', minScore: 200, nextScore: 500, color: '#F59E0B' };
  if (score >= 50) return { tier: 'Code Warrior', badge: '🥈', minScore: 50, nextScore: 200, color: '#10B981' };
  return { tier: 'Novice Coder', badge: '🥉', minScore: 0, nextScore: 50, color: '#6B7280' };
}

module.exports = { getTierInfo };
