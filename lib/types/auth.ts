/**
 * Authentication and Authorization Types
 */

export type AccountRole = 'master' | 'franchise';

/**
 * Franchise account stored in JSON file
 */
export interface FranchiseAccount {
  id: string;
  username: string;
  password: string;              // bcrypt hashed password
  role: AccountRole;
  displayName: string;           // e.g., "강남지역 본사"
  assignedStoreIds: string[];    // MongoDB ObjectId strings
  createdAt: string;             // ISO timestamp
  isActive: boolean;
}

/**
 * Session data stored in JWT and localStorage
 */
export interface AuthSession {
  username: string;
  role: AccountRole;
  assignedStoreIds?: string[];   // Only for franchise accounts
  displayName: string;
  expiresAt: number;             // Unix timestamp
}

/**
 * Login request/response types
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  session?: AuthSession;
  error?: string;
}
