const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const { getDb, supabase } = require('./database');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const syncRoutes = require('./routes/syncRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const friendRoutes = require('./routes/friendRoutes');
const platformRoutes = require('./routes/platformRoutes');

const app = express();

process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

app.use(cors());
app.use(express.json());

// Root Status Page
app.get('/', (req, res) => {
  res.json({
    name: 'CodeArena API Server (Supabase Powered)',
    status: 'online',
    version: '2.0.0',
    database: supabase ? 'supabase' : 'unconfigured',
    endpoints: {
      health: '/api/health',
      rankings: '/api/rankings',
      events: '/api/events',
      friends: '/api/friends',
    },
  });
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  if (supabase) {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      dbStatus = error ? `error: ${error.message}` : 'connected';
    } catch (e) {
      dbStatus = `exception: ${e.message}`;
    }
  }

  res.json({
    status: 'live',
    database: dbStatus,
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
app.use('/api/friends', friendRoutes);
app.use('/api/platforms', platformRoutes);

// Automatic Event Status Maintenance Cron Task
async function updateStatuses() {
  if (!supabase) return;
  try {
    const now = new Date().toISOString();
    await supabase
      .from('events')
      .update({ status: 'active' })
      .eq('status', 'upcoming')
      .lte('start_date', now);

    await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lte('end_date', now);
  } catch (e) {
    console.error('Status maintenance error:', e.message);
  }
}

// Server Bootstrap
async function startServer() {
  await getDb();
  await updateStatuses();
  setInterval(updateStatuses, 60000);

  app.listen(PORT, () => {
    console.log(`🚀 CodeArena API running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
