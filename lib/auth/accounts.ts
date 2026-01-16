/**
 * Account Management
 * Loads and validates Master and Franchise accounts
 */

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { FranchiseAccount, AuthSession } from '@/lib/types/auth';

const MASTER_USERNAME = process.env.MASTER_USERNAME || 'taghere';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || '$2b$10$K7eP6wXQZ4L3kH8vN9qZEuXxJGZ0Qz3Y5fQ6wR7tY8uV9pW0xA1B2'; // default: '0614'
const FRANCHISE_ACCOUNTS_PATH = process.env.FRANCHISE_ACCOUNTS_PATH || path.join(process.cwd(), 'data', 'franchise-accounts.json');

/**
 * Load franchise accounts from JSON file
 */
function loadFranchiseAccounts(): FranchiseAccount[] {
  try {
    if (!fs.existsSync(FRANCHISE_ACCOUNTS_PATH)) {
      console.warn(`Franchise accounts file not found: ${FRANCHISE_ACCOUNTS_PATH}`);
      return [];
    }

    const fileContent = fs.readFileSync(FRANCHISE_ACCOUNTS_PATH, 'utf-8');
    const accounts = JSON.parse(fileContent) as FranchiseAccount[];

    // Filter active accounts only
    return accounts.filter(account => account.isActive);
  } catch (error) {
    console.error('Failed to load franchise accounts:', error);
    return [];
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

  // Check Franchise accounts
  const franchiseAccounts = loadFranchiseAccounts();
  const account = franchiseAccounts.find(acc => acc.username === username);

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
