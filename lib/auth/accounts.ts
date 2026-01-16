/**
 * Account Management
 * Loads and validates Master and Franchise accounts
 */

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { FranchiseAccount, AuthSession } from '@/lib/types/auth';

const MASTER_USERNAME = 'taghere';
const MASTER_PASSWORD = '$2b$10$WrZUscgInenASqOoH81bhOeH0S3VBHUaivPL023pgzSsxn4Hx60wC'; // bcrypt hash for '0614'
const FRANCHISE_ACCOUNTS_PATH = path.join(process.cwd(), 'data', 'franchise-accounts.json');

/**
 * Load franchise accounts from JSON file
 * Returns empty array in production/serverless environments where file system is read-only
 */
export function loadFranchiseAccounts(): FranchiseAccount[] {
  try {
    // In serverless environments (like Vercel), file system may be read-only
    // Return empty array if file doesn't exist
    if (!fs.existsSync(FRANCHISE_ACCOUNTS_PATH)) {
      return [];
    }

    const fileContent = fs.readFileSync(FRANCHISE_ACCOUNTS_PATH, 'utf-8');
    const accounts = JSON.parse(fileContent) as FranchiseAccount[];

    return accounts; // Return all accounts, not just active ones
  } catch (error) {
    // Silent fail in production - just return empty array
    console.warn('Could not load franchise accounts:', error);
    return [];
  }
}

/**
 * Save franchise accounts to JSON file
 * May fail in serverless environments - catches error gracefully
 */
export function saveFranchiseAccounts(accounts: FranchiseAccount[]): void {
  try {
    const dirPath = path.dirname(FRANCHISE_ACCOUNTS_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      FRANCHISE_ACCOUNTS_PATH,
      JSON.stringify(accounts, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save franchise accounts (this is expected in serverless environments):', error);
    throw new Error('File system operations not available in this environment. Please use a database for franchise accounts.');
  }
}

/**
 * Validate credentials and return session if successful
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<AuthSession | null> {
  // Check Master account first
  if (username === MASTER_USERNAME) {
    const isValid = await bcrypt.compare(password, MASTER_PASSWORD);
    if (isValid) {
      return {
        username: MASTER_USERNAME,
        role: 'master',
        displayName: 'Master Admin',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };
    }
  }

  // Check Franchise accounts (only active ones for login)
  const franchiseAccounts = loadFranchiseAccounts();
  const account = franchiseAccounts.find(acc => acc.username === username && acc.isActive);

  if (!account) {
    return null;
  }

  const isValid = await bcrypt.compare(password, account.password);
  if (!isValid) {
    return null;
  }

  return {
    username: account.username,
    role: 'franchise',
    assignedStoreIds: account.assignedStoreIds,
    displayName: account.displayName,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * Get franchise account by username
 */
export function getFranchiseAccount(username: string): FranchiseAccount | null {
  const accounts = loadFranchiseAccounts();
  return accounts.find(acc => acc.username === username) || null;
}

/**
 * Get all franchise accounts (for admin UI)
 */
export function getAllFranchiseAccounts(): FranchiseAccount[] {
  return loadFranchiseAccounts();
}
