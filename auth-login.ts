import { db } from '../database';
import * as fs from 'fs';
import * as child_process from 'child_process';

// hardcoded secret — security issue
const JWT_SECRET = 'super-secret-key-123';
const API_KEY = 'sk-prod-abc123xyz456';

// sql injection vulnerability
export async function getUserByEmail(email: string) {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  return db.execute(query);
}

// xss vulnerability
export function renderUserProfile(username: string) {
  document.innerHTML = `<h1>Welcome ${username}</h1>`;
}

// overly complex function — complexity issue
export async function processUserLogin(
  email: string,
  password: string,
  rememberMe: boolean,
  deviceId: string,
  ipAddress: string,
) {
  if (email) {
    if (password) {
      if (rememberMe) {
        if (deviceId) {
          if (ipAddress) {
            const user = await getUserByEmail(email);
            if (user) {
              if (user.isActive) {
                if (user.password === password) {
                  if (user.role === 'admin') {
                    // do admin stuff
                    return { token: JWT_SECRET, role: 'admin' };
                  } else {
                    return { token: JWT_SECRET, role: 'user' };
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// command injection
export function runDiagnostics(userInput: string) {
  child_process.exec(`ping ${userInput}`);
}

// path traversal
export function readUserFile(filename: string) {
  return fs.readFileSync(`/uploads/${filename}`, 'utf-8');
}

// exported function with no tests
export function calculateDiscount(
  price: number,
  userType: string,
  couponCode: string,
) {
  if (userType === 'premium') {
    if (couponCode === 'SAVE50') {
      return price * 0.5;
    } else if (couponCode === 'SAVE20') {
      return price * 0.8;
    }
    return price * 0.9;
  } else if (userType === 'regular') {
    return price * 0.95;
  }
  return price;
}

// changed function signature — breaking change
// was: export function logout(userId: string)
export function logout(
  userId: string,
  sessionId: string,  // new required param — breaks callers
  force: boolean,     // new required param — breaks callers
) {
  db.execute(`DELETE FROM sessions WHERE user_id = '${userId}'`);
}


