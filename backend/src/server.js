const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const { getDb, prepareRun } = require('./database');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const syncRoutes = require('./routes/syncRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Root Status Page
app.get('/', (req, res) => {
  res.json({
    name: '🔥 CodeArena API Server',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      rankings: '/api/rankings',
      events: '/api/events'
    }
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'live',
    message: 'CodeArena API is up and running!',
    timestamp: new Date().toISOString(),
  });
});

// Register Modular Routers
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/notifications', notificationRoutes);

// Automatic Event Status Maintenance Cron Task
function updateStatuses() {
  const now = new Date().toISOString();
  prepareRun("UPDATE events SET status='active' WHERE status='upcoming' AND start_date<=?", [now]);
  prepareRun("UPDATE events SET status='completed' WHERE status='active' AND end_date<=?", [now]);
}

// Server Bootstrap
async function startServer() {
  await getDb();
  updateStatuses();
  setInterval(updateStatuses, 60000);

  app.listen(PORT, () => {
    console.log(`🚀 CodeArena API running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
