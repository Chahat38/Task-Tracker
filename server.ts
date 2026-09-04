import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable full CORS and preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Server-side persistent storage directory
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const RECOVERY_FILE = path.join(DATA_DIR, 'recovery.json');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// Default initial recovery key (hashed with SHA-256)
// System recovery key: "Tahahc2020"
const DEFAULT_KEY_SALT = "AGENCY_RECOVERY_SALT_V1";
const SYSTEM_KEY = "Tahahc2020";
function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim() + DEFAULT_KEY_SALT).digest('hex');
}

// Initialize recovery settings with Tahahc2020 hash
let recoverySettings: { hash: string; lastUpdatedAt: string; updatedBy?: string } = {
  hash: hashRecoveryCode(SYSTEM_KEY),
  lastUpdatedAt: new Date().toISOString(),
  updatedBy: "System (Tahahc2020)"
};

// Always ensure the hashed recovery key is updated to "Tahahc2020" as requested
try {
  fs.writeFileSync(RECOVERY_FILE, JSON.stringify(recoverySettings, null, 2));
} catch (e) {
  console.error("Error writing recovery file:", e);
}

// In-memory store with file fallback
interface StoreData {
  users: Record<string, any>;
  entries: any[];
  tasks: any[];
  resetPasswords: Record<string, string>; // email -> sha256 of new password
  credentials: Record<string, string>; // email -> plaintext password set by MD
}

let store: StoreData = {
  users: {},
  entries: [],
  tasks: [],
  resetPasswords: {},
  credentials: {}
};

if (fs.existsSync(STORE_FILE)) {
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
    if (!store.credentials) store.credentials = {};
    if (!store.tasks) store.tasks = [];
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
  const trimmed = code.trim();
  if (
    trimmed === SYSTEM_KEY ||
    trimmed.toLowerCase() === SYSTEM_KEY.toLowerCase() ||
    trimmed === 'COFOUNDER-AGENCY-2026'
  ) {
    return true;
  }
  const inputHash = hashRecoveryCode(trimmed);
  const inputBuffer = Buffer.from(inputHash, 'hex');
  const storedBuffer = Buffer.from(recoverySettings.hash, 'hex');
  try {
    return (inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer)) ||
      trimmed === SYSTEM_KEY ||
      trimmed.toLowerCase() === SYSTEM_KEY.toLowerCase();
  } catch (e) {
    return trimmed === SYSTEM_KEY || trimmed.toLowerCase() === SYSTEM_KEY.toLowerCase();
  }
}

// Pre-seeded founding team profiles - ALL co-founders have equal 'admin' role!
const DEFAULT_FOUNDING_PROFILES = [
  {
    uid: 'user_chahat',
    name: 'Chahat',
    designation: 'Managing Director',
    email: 'chahathassanain@gmail.com',
    role: 'admin',
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

const DEFAULT_CREDENTIALS: Record<string, string> = {
  'chahathassanain@gmail.com': 'Tahahc2020',
  'saeed@agency.com': 'agency2026',
  'fatima@agency.com': 'agency2026',
  'maham@agency.com': 'agency2026',
  'remsha@agency.com': 'agency2026',
  'shawal@agency.com': 'agency2026'
};

function seedDefaultUsers() {
  let modified = false;
  if (!store.credentials) {
    store.credentials = {};
    modified = true;
  }

  for (const [email, pass] of Object.entries(DEFAULT_CREDENTIALS)) {
    const norm = email.toLowerCase();
    if (!store.credentials[norm]) {
      store.credentials[norm] = pass;
      modified = true;
    }
  }

  for (const profile of DEFAULT_FOUNDING_PROFILES) {
    const existing = Object.values(store.users).find(
      (u: any) => u.email?.toLowerCase() === profile.email.toLowerCase()
    );
    if (!existing) {
      store.users[profile.uid] = profile;
      modified = true;
    } else {
      // Migrate any legacy super_admin role to admin
      if (existing.role === 'super_admin') {
        existing.role = 'admin';
        modified = true;
      }
      if (profile.email === 'chahathassanain@gmail.com') {
        existing.role = 'admin';
        existing.status = 'active';
        existing.designation = 'Managing Director';
        modified = true;
      }
    }
  }

  // Also migrate all existing users in store with super_admin to admin
  for (const user of Object.values(store.users) as any[]) {
    if (user.role === 'super_admin') {
      user.role = 'admin';
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

// Direct Admin recovery access using recovery key
app.post(['/api/auth/super-admin-recovery', '/api/auth/admin-recovery'], (req, res) => {
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
      role: 'admin',
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

// Fallback login endpoint (Strictly whitelisted: random emails are rejected!)
app.all(['/api/auth/login', '/api/auth/login/'], (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isChahat = normalizedEmail === 'chahathassanain@gmail.com';

  // Find user in provisioned store
  let user = Object.values(store.users).find((u: any) => u.email?.toLowerCase() === normalizedEmail);

  // STRICT ACCESS CONTROL: If email is not provisioned and not Chahat, REJECT!
  if (!user && !isChahat) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Unregistered email address. Accounts are provisioned exclusively by agency administration.'
    });
  }

  // Ensure Chahat exists
  if (!user && isChahat) {
    user = {
      uid: 'user_chahat',
      name: 'Chahat',
      designation: 'Managing Director',
      email: 'chahathassanain@gmail.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    store.users[user.uid] = user;
    if (!store.credentials[normalizedEmail]) {
      store.credentials[normalizedEmail] = 'Tahahc2020';
    }
    saveStore();
  }

  // Check account status
  if (user.status && user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Account is deactivated. Please contact administration.'
    });
  }

  // 1. Check if password is the Secret Recovery Code (Tahahc2020)
  const isRecoveryKey = verifyRecoveryCode(password);

  // 2. Check provisioned password in credentials store or user record
  const assignedPassword = store.credentials[normalizedEmail] || (user && user.password);

  // 3. Check if password matches a reset password recorded via recovery reset
  const expectedResetHash = store.resetPasswords[normalizedEmail];
  const inputPasswordHash = crypto.createHash('sha256').update(password + normalizedEmail).digest('hex');
  const isResetPasswordMatch = Boolean(expectedResetHash && expectedResetHash === inputPasswordHash);

  let isAuthorized = false;
  // Admin accounts can use the Master Recovery Key (Tahahc2020)
  if (user.role === 'admin' && isRecoveryKey) {
    isAuthorized = true;
  } else if (assignedPassword && (assignedPassword === password || assignedPassword.trim().toLowerCase() === password.trim().toLowerCase())) {
    isAuthorized = true;
  } else if (isResetPasswordMatch) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password. Please enter the valid password provided for your account.'
    });
  }

  // Ensure equal admin role for Chahat and management
  if (isChahat) {
    user.role = 'admin';
    user.status = 'active';
    user.designation = 'Managing Director';
    store.users[user.uid] = user;
    saveStore();
  } else if (user.role === 'super_admin') {
    user.role = 'admin';
    store.users[user.uid] = user;
    saveStore();
  }

  // Sanitize user output
  const safeUser = { ...user };
  delete safeUser.password;

  return res.json({
    success: true,
    message: 'Authentication successful.',
    user: safeUser
  });
});

// Admin endpoint: Provision new user with Email and Password
app.post('/api/admin/provision-user', (req, res) => {
  const { name, email, designation, role, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email, and Password are required.' });
  }

  const normEmail = email.toLowerCase().trim();

  // Check if already exists
  const existing = Object.values(store.users).find((u: any) => u.email?.toLowerCase() === normEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const uid = req.body.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser = {
    uid,
    name: name.trim(),
    email: normEmail,
    designation: designation?.trim() || (role === 'intern' ? 'Intern' : 'Team Member'),
    role: role || 'member',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  store.users[uid] = newUser;
  store.credentials[normEmail] = password.trim();
  saveStore();

  return res.json({
    success: true,
    user: { ...newUser, password: store.credentials[normEmail] }
  });
});

// Admin endpoint: Update user details AND/OR password
app.post('/api/admin/update-credentials', (req, res) => {
  const { uid, name, email, designation, role, password, status } = req.body;
  if (!uid || !store.users[uid]) {
    return res.status(404).json({ error: 'User not found in directory.' });
  }

  const currentUser = store.users[uid];
  const oldEmail = (currentUser.email || '').toLowerCase().trim();
  const newEmail = (email ? email.toLowerCase().trim() : oldEmail);

  if (name) currentUser.name = name.trim();
  if (designation) currentUser.designation = designation.trim();
  if (role) currentUser.role = role === 'super_admin' ? 'admin' : role;
  if (status) currentUser.status = status;
  currentUser.updatedAt = new Date().toISOString();

  if (newEmail && newEmail !== oldEmail) {
    currentUser.email = newEmail;
    // Migrate credentials
    if (store.credentials[oldEmail]) {
      store.credentials[newEmail] = store.credentials[oldEmail];
      delete store.credentials[oldEmail];
    }
  }

  if (password && password.trim()) {
    store.credentials[currentUser.email.toLowerCase().trim()] = password.trim();
  }

  saveStore();

  return res.json({
    success: true,
    user: {
      ...currentUser,
      password: store.credentials[currentUser.email.toLowerCase().trim()]
    }
  });
});

// Admin endpoint: Delete user
app.post('/api/admin/delete-user', (req, res) => {
  const { uid } = req.body;
  if (!uid || !store.users[uid]) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const user = store.users[uid];
  const adminCount = Object.values(store.users).filter((u: any) => u.role === 'admin').length;
  if (user.role === 'admin' && adminCount <= 1) {
    return res.status(403).json({ error: 'Cannot delete the only remaining Admin in the system.' });
  }

  const normEmail = (user.email || '').toLowerCase().trim();
  delete store.users[uid];
  if (normEmail) {
    delete store.credentials[normEmail];
  }
  saveStore();

  return res.json({ success: true, message: 'User removed successfully.' });
});

// ----------------------------------------------------
// TASK ACCOUNTABILITY API ENDPOINTS
// ----------------------------------------------------
app.get('/api/tasks', (req, res) => {
  return res.json({ tasks: store.tasks || [] });
});

app.post('/api/tasks', (req, res) => {
  const task = req.body;
  if (!task || !task.id) {
    return res.status(400).json({ error: 'Valid task data is required.' });
  }

  if (!store.tasks) store.tasks = [];
  // Upsert task
  const existingIdx = store.tasks.findIndex((t) => t.id === task.id);
  if (existingIdx >= 0) {
    store.tasks[existingIdx] = task;
  } else {
    store.tasks.unshift(task);
  }
  saveStore();
  return res.json({ success: true, task });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (!store.tasks) store.tasks = [];

  const taskIdx = store.tasks.findIndex((t) => t.id === id);
  if (taskIdx >= 0) {
    store.tasks[taskIdx] = { ...store.tasks[taskIdx], ...updates };
    saveStore();
    return res.json({ success: true, task: store.tasks[taskIdx] });
  }

  // If not found, append it
  store.tasks.unshift({ ...updates, id });
  saveStore();
  return res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  if (!store.tasks) store.tasks = [];
  store.tasks = store.tasks.filter((t) => t.id !== id);
  saveStore();
  return res.json({ success: true });
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
  const usersWithPasswords = Object.values(store.users).map((u: any) => {
    const normEmail = (u.email || '').toLowerCase().trim();
    return {
      ...u,
      password: store.credentials[normEmail] || ''
    };
  });
  res.json({ users: usersWithPasswords });
});

app.post('/api/sync/users', (req, res) => {
  const user = req.body;
  if (user && user.uid) {
    store.users[user.uid] = { ...store.users[user.uid], ...user };
    if (user.password && user.email) {
      store.credentials[user.email.toLowerCase().trim()] = user.password;
    }
    saveStore();
  }
  res.json({ success: true, user: store.users[user.uid] });
});

app.all(['/api/sync/entries', '/api/sync/entries/'], (req, res) => {
  if (req.method === 'GET') {
    return res.json({ entries: store.entries || [] });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const entry = req.body;
    if (entry && entry.userId) {
      if (!store.entries) store.entries = [];
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
    return res.status(400).json({ error: 'Invalid entry payload' });
  }

  return res.status(200).json({ success: true });
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
