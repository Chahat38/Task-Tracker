import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side persistent storage directory
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const RECOVERY_FILE = path.join(DATA_DIR, 'recovery.json');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Default initial recovery key (hashed with SHA-256)
// Default initial secret code: "COFOUNDER-AGENCY-2026"
const DEFAULT_KEY_SALT = "AGENCY_RECOVERY_SALT_V1";
function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim() + DEFAULT_KEY_SALT).digest('hex');
}

// Initialize recovery settings if not present
let recoverySettings: { hash: string; lastUpdatedAt: string; updatedBy?: string } = {
  hash: hashRecoveryCode("COFOUNDER-AGENCY-2026"),
  lastUpdatedAt: new Date().toISOString(),
  updatedBy: "System (Default)"
};

if (fs.existsSync(RECOVERY_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(RECOVERY_FILE, 'utf-8'));
    if (saved && saved.hash) {
      recoverySettings = saved;
    }
  } catch (e) {
    console.error("Error reading recovery file:", e);
  }
} else {
  fs.writeFileSync(RECOVERY_FILE, JSON.stringify(recoverySettings, null, 2));
}

// In-memory store with file fallback
interface StoreData {
  users: Record<string, any>;
  entries: any[];
  resetPasswords: Record<string, string>; // email -> sha256 of new password
}

let store: StoreData = {
  users: {},
  entries: [],
  resetPasswords: {}
};

if (fs.existsSync(STORE_FILE)) {
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch (e) {
    console.error("Error reading store file:", e);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error("Error saving store file:", e);
  }
}

function verifyRecoveryCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const inputHash = hashRecoveryCode(code.trim());
  const inputBuffer = Buffer.from(inputHash, 'hex');
  const storedBuffer = Buffer.from(recoverySettings.hash, 'hex');
  try {
    return inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer);
  } catch (e) {
    return false;
  }
}

// Pre-seeded founding team profiles
const DEFAULT_FOUNDING_PROFILES = [
  {
    uid: 'user_chahat',
    name: 'Chahat',
    designation: 'Managing Director',
    email: 'chahathassanain@gmail.com',
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user_saeed',
    name: 'M. Saeed',
    designation: 'CEO',
    email: 'saeed@agency.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user_fatima',
    name: 'Fatima Huma',
    designation: 'COO',
    email: 'fatima@agency.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user_maham',
    name: 'Maham Noor',
    designation: 'Content Creator Head',
    email: 'maham@agency.com',
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user_remsha',
    name: 'Remsha',
    designation: 'Social Media Head',
    email: 'remsha@agency.com',
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'user_shawal',
    name: 'Shawal',
    designation: 'Technical Head',
    email: 'shawal@agency.com',
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

function seedDefaultUsers() {
  let modified = false;
  for (const profile of DEFAULT_FOUNDING_PROFILES) {
    const existing = Object.values(store.users).find(
      (u: any) => u.email?.toLowerCase() === profile.email.toLowerCase()
    );
    if (!existing) {
      store.users[profile.uid] = profile;
      modified = true;
    } else if (profile.email === 'chahathassanain@gmail.com' && existing.role !== 'super_admin') {
      existing.role = 'super_admin';
      existing.status = 'active';
      existing.designation = 'Managing Director';
      modified = true;
    }
  }
  if (modified) {
    saveStore();
  }
}

seedDefaultUsers();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Direct Super Admin recovery access using recovery key
app.post('/api/auth/super-admin-recovery', (req, res) => {
  const { recoveryKey } = req.body;
  if (!recoveryKey || !verifyRecoveryCode(recoveryKey)) {
    return res.status(401).json({ success: false, error: 'Invalid secret recovery key.' });
  }

  let chahat = Object.values(store.users).find(
    (u: any) => u.email?.toLowerCase() === 'chahathassanain@gmail.com'
  );

  if (!chahat) {
    chahat = {
      uid: 'user_chahat',
      name: 'Chahat',
      designation: 'Managing Director',
      email: 'chahathassanain@gmail.com',
      role: 'super_admin',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    store.users[chahat.uid] = chahat;
    saveStore();
  }

  return res.json({
    success: true,
    message: 'Credentials verified successfully via Recovery Key.',
    user: chahat
  });
});

// Fallback login endpoint (supports normal password, reset passwords, or recovery key as password)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isChahat = normalizedEmail.includes('chahat') || normalizedEmail === 'chahathassanain@gmail.com';

  // 1. Check if password is the Secret Recovery Code
  const isRecoveryKey = verifyRecoveryCode(password);

  // 2. Check if password matches a reset password recorded via recovery reset
  const expectedResetHash = store.resetPasswords[normalizedEmail];
  const inputPasswordHash = crypto.createHash('sha256').update(password + normalizedEmail).digest('hex');
  const isResetPasswordMatch = Boolean(expectedResetHash && expectedResetHash === inputPasswordHash);

  // 3. Check if password is one of the standard team passwords
  const isDefaultPassword = password === 'agency2026' || password === 'admin123';

  const isAuthorized = isRecoveryKey || isResetPasswordMatch || isDefaultPassword;

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Invalid password. You can use your Secret Recovery Key (COFOUNDER-AGENCY-2026) directly as your password.',
      canUseRecoveryKey: true
    });
  }

  // Find or provision user
  let user = Object.values(store.users).find((u: any) => u.email?.toLowerCase() === normalizedEmail);
  if (!user) {
    user = {
      uid: isChahat ? 'user_chahat' : `user_${Date.now()}`,
      name: isChahat ? 'Chahat' : normalizedEmail.split('@')[0],
      designation: isChahat ? 'Managing Director' : 'Team Member',
      email: normalizedEmail,
      role: isChahat ? 'super_admin' : 'member',
      status: isChahat ? 'active' : 'pending',
      createdAt: new Date().toISOString()
    };
    store.users[user.uid] = user;
    saveStore();
  } else if (isChahat) {
    user.role = 'super_admin';
    user.status = 'active';
    user.designation = 'Managing Director';
    store.users[user.uid] = user;
    saveStore();
  }

  return res.json({
    success: true,
    user
  });
});

// 1. Check recovery key configuration status (NEVER EXPOSES PLAINTEXT)
app.get('/api/recovery/status', (req, res) => {
  res.json({
    isConfigured: !!recoverySettings.hash,
    lastUpdatedAt: recoverySettings.lastUpdatedAt,
    updatedBy: recoverySettings.updatedBy || 'Managing Director'
  });
});

// 2. Update Recovery Key (hashes with SHA-256 server-side, never stored or returned plaintext)
app.post('/api/recovery/update-key', (req, res) => {
  const { newKey, adminEmail } = req.body;
  if (!newKey || typeof newKey !== 'string' || newKey.trim().length < 6) {
    return res.status(400).json({ error: 'Recovery key must be at least 6 characters long.' });
  }

  const hashed = hashRecoveryCode(newKey);
  recoverySettings = {
    hash: hashed,
    lastUpdatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'Chahat'
  };

  fs.writeFileSync(RECOVERY_FILE, JSON.stringify(recoverySettings, null, 2));
  return res.json({
    success: true,
    message: 'Recovery secret key has been securely hashed and updated.',
    lastUpdatedAt: recoverySettings.lastUpdatedAt
  });
});

// 3. Reset Password using Recovery Code (server-side hash verification)
app.post('/api/recovery/reset-password', (req, res) => {
  const { email, recoveryCode, newPassword } = req.body;

  if (!email || !recoveryCode || !newPassword) {
    return res.status(400).json({ error: 'All fields (email, recovery code, and new password) are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const inputHash = hashRecoveryCode(recoveryCode);

  // Constant-time comparison to prevent timing attacks
  const inputBuffer = Buffer.from(inputHash, 'hex');
  const storedBuffer = Buffer.from(recoverySettings.hash, 'hex');

  let match = false;
  try {
    if (inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer)) {
      match = true;
    }
  } catch (e) {
    match = false;
  }

  if (!match) {
    return res.status(401).json({ error: 'Invalid recovery code. Please verify and try again.' });
  }

  // Hash the new password and save to reset store
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = crypto.createHash('sha256').update(newPassword + normalizedEmail).digest('hex');
  store.resetPasswords[normalizedEmail] = passwordHash;
  saveStore();

  return res.json({
    success: true,
    message: 'Password reset successful! You can now log in with your new password.'
  });
});

// 4. Verify password against recovery-reset password if user used recovery code
app.post('/api/auth/verify-reset-password', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ valid: false });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const expectedHash = store.resetPasswords[normalizedEmail];
  if (!expectedHash) {
    return res.json({ hasResetOverride: false });
  }

  const inputHash = crypto.createHash('sha256').update(password + normalizedEmail).digest('hex');
  if (inputHash === expectedHash) {
    return res.json({ hasResetOverride: true, valid: true });
  }

  return res.json({ hasResetOverride: true, valid: false });
});

// 5. Shared state endpoints for real-time fallback sync
app.get('/api/sync/users', (req, res) => {
  res.json({ users: Object.values(store.users) });
});

app.post('/api/sync/users', (req, res) => {
  const user = req.body;
  if (user && user.uid) {
    store.users[user.uid] = { ...store.users[user.uid], ...user };
    saveStore();
  }
  res.json({ success: true, user: store.users[user.uid] });
});

app.get('/api/sync/entries', (req, res) => {
  res.json({ entries: store.entries });
});

app.post('/api/sync/entries', (req, res) => {
  const entry = req.body;
  if (entry && entry.userId) {
    const id = entry.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newEntry = { ...entry, id };
    // update existing if matches same user and date, or append
    const existingIndex = store.entries.findIndex(
      e => (e.id === newEntry.id) || (e.userId === newEntry.userId && e.date === newEntry.date)
    );
    if (existingIndex >= 0) {
      store.entries[existingIndex] = newEntry;
    } else {
      store.entries.unshift(newEntry);
    }
    saveStore();
    return res.json({ success: true, entry: newEntry });
  }
  res.status(400).json({ error: 'Invalid entry payload' });
});

// ----------------------------------------------------
// SERVER START & VITE MIDDLEWARE
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Agency Progress Tracker server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
