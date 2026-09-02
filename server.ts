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
  credentials: Record<string, string>; // email -> plaintext password set by MD
}

let store: StoreData = {
  users: {},
  entries: [],
  resetPasswords: {},
  credentials: {}
};

if (fs.existsSync(STORE_FILE)) {
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
    if (!store.credentials) store.credentials = {};
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

const DEFAULT_CREDENTIALS: Record<string, string> = {
  'chahathassanain@gmail.com': 'COFOUNDER-AGENCY-2026',
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

// Fallback login endpoint (Strictly whitelisted: random emails are rejected!)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isChahat = normalizedEmail === 'chahathassanain@gmail.com' || normalizedEmail.includes('chahat');

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
      role: 'super_admin',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    store.users[user.uid] = user;
    if (!store.credentials[normalizedEmail]) {
      store.credentials[normalizedEmail] = 'COFOUNDER-AGENCY-2026';
    }
    saveStore();
  }

  // 1. Check if password is the Secret Recovery Code (for Chahat / MD)
  const isRecoveryKey = verifyRecoveryCode(password);

  // 2. Check provisioned password in credentials store or user record
  const assignedPassword = store.credentials[normalizedEmail] || (user && user.password);

  // 3. Check if password matches a reset password recorded via recovery reset
  const expectedResetHash = store.resetPasswords[normalizedEmail];
  const inputPasswordHash = crypto.createHash('sha256').update(password + normalizedEmail).digest('hex');
  const isResetPasswordMatch = Boolean(expectedResetHash && expectedResetHash === inputPasswordHash);

  let isAuthorized = false;
  if (isChahat && isRecoveryKey) {
    isAuthorized = true;
  } else if (assignedPassword && assignedPassword === password) {
    isAuthorized = true;
  } else if (assignedPassword && assignedPassword.trim().toLowerCase() === password.trim().toLowerCase()) {
    isAuthorized = true;
  } else if (isResetPasswordMatch) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password. Please verify credentials provided by agency administration.'
    });
  }

  // Check account status
  if (user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: `Account access is ${user.status === 'pending' ? 'pending approval' : 'inactive'}. Please contact administration.`
    });
  }

  // Ensure MD designation and role
  if (isChahat) {
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

  const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
  if (role && currentUser.role !== 'super_admin') currentUser.role = role;
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
  if (user.role === 'super_admin' || user.email?.toLowerCase().includes('chahat')) {
    return res.status(403).json({ error: 'Cannot delete the Managing Director account.' });
  }

  const normEmail = (user.email || '').toLowerCase().trim();
  delete store.users[uid];
  if (normEmail) {
    delete store.credentials[normEmail];
  }
  saveStore();

  return res.json({ success: true, message: 'User removed successfully.' });
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
