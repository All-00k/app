const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'codearena.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      leetcode_id TEXT UNIQUE NOT NULL,
      avatar_url TEXT DEFAULT '',
      total_easy INTEGER DEFAULT 0,
      total_medium INTEGER DEFAULT 0,
      total_hard INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'Novice Coder',
      xp INTEGER DEFAULT 0,
      push_token TEXT DEFAULT '',
      last_synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create events table with mode & topic
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      mode TEXT DEFAULT 'standard',
      topic TEXT DEFAULT '',
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'completed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  // Ensure mode and topic columns exist for events table
  try { db.run("ALTER TABLE events ADD COLUMN mode TEXT DEFAULT 'standard'"); } catch (e) {}
  try { db.run("ALTER TABLE events ADD COLUMN topic TEXT DEFAULT ''"); } catch (e) {}

  // Create event_participants table
  db.run(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      easy_at_join INTEGER DEFAULT 0,
      medium_at_join INTEGER DEFAULT 0,
      hard_at_join INTEGER DEFAULT 0,
      current_easy INTEGER DEFAULT 0,
      current_medium INTEGER DEFAULT 0,
      current_hard INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(event_id, user_id)
    )
  `);

  // Create daily_progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      easy_solved INTEGER DEFAULT 0,
      medium_solved INTEGER DEFAULT 0,
      hard_solved INTEGER DEFAULT 0,
      daily_score INTEGER DEFAULT 0,
      FOREIGN KEY (participant_id) REFERENCES event_participants(id),
      UNIQUE(participant_id, date)
    )
  `);

  // Create notifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'solve_alert',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migration checks for existing databases
  try { db.run("ALTER TABLE events ADD COLUMN mode TEXT DEFAULT 'standard'"); } catch {}
  try { db.run("ALTER TABLE events ADD COLUMN topic TEXT DEFAULT ''"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'Novice Coder'"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN push_token TEXT DEFAULT ''"); } catch {}

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function prepareGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function prepareAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function prepareRun(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
  saveDb();
  return { lastInsertRowid: lastId };
}

module.exports = { getDb, saveDb, prepareGet, prepareAll, prepareRun };
