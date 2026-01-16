import { NextRequest, NextResponse } from 'next/server';
import { withMasterOnly } from '@/lib/auth/middleware';
import { loadFranchiseAccounts, saveFranchiseAccounts } from '@/lib/auth/accounts';
import { FranchiseAccount } from '@/lib/types/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/brands/franchises
 * List all franchise accounts (Master only)
 */
export async function GET(request: NextRequest) {
  return withMasterOnly(request, async () => {
    try {
      const accounts = loadFranchiseAccounts();

      // Remove password from response
      const franchises = accounts.map(({ password, ...account }) => account);

      return NextResponse.json({
        success: true,
        franchises,
      });
    } catch (error: any) {
      console.error('Load franchises error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/brands/franchises
 * Create a new franchise account (Master only)
 */
export async function POST(request: NextRequest) {
  return withMasterOnly(request, async () => {
    try {
      const body = await request.json();
      const { username, password, displayName, assignedStoreIds } = body;

      // Validate required fields
      if (!username || !password || !displayName) {
        return NextResponse.json(
          { success: false, error: 'Username, password, and displayName are required' },
          { status: 400 }
        );
      }

      // Load existing accounts
      const accounts = loadFranchiseAccounts();

      // Check if username already exists
      if (accounts.some(acc => acc.username === username)) {
        return NextResponse.json(
          { success: false, error: 'Username already exists' },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new franchise account
      const newAccount: FranchiseAccount = {
        id: `franchise-${Date.now()}`,
        username,
        password: hashedPassword,
        role: 'franchise',
        displayName,
        assignedStoreIds: assignedStoreIds || [],
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Save to file
      accounts.push(newAccount);
      saveFranchiseAccounts(accounts);

      // Return without password
      const { password: _, ...accountWithoutPassword } = newAccount;

      return NextResponse.json({
        success: true,
        franchise: accountWithoutPassword,
      });
    } catch (error: any) {
      console.error('Create franchise error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}
