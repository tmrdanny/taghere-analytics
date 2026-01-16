import { NextRequest, NextResponse } from 'next/server';
import { withMasterOnly } from '@/lib/auth/middleware';
import { loadFranchiseAccounts, saveFranchiseAccounts } from '@/lib/auth/accounts';
import bcrypt from 'bcryptjs';

/**
 * PUT /api/brands/franchises/[id]
 * Update a franchise account (Master only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMasterOnly(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { displayName, assignedStoreIds, password } = body;

      // Load existing accounts
      const accounts = loadFranchiseAccounts();

      // Find account to update
      const accountIndex = accounts.findIndex(acc => acc.id === id);
      if (accountIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Franchise account not found' },
          { status: 404 }
        );
      }

      // Update account
      const updatedAccount = { ...accounts[accountIndex] };

      if (displayName) {
        updatedAccount.displayName = displayName;
      }

      if (assignedStoreIds !== undefined) {
        updatedAccount.assignedStoreIds = assignedStoreIds;
      }

      if (password) {
        updatedAccount.password = await bcrypt.hash(password, 10);
      }

      // Save to file
      accounts[accountIndex] = updatedAccount;
      saveFranchiseAccounts(accounts);

      // Return without password
      const { password: _, ...accountWithoutPassword } = updatedAccount;

      return NextResponse.json({
        success: true,
        franchise: accountWithoutPassword,
      });
    } catch (error: any) {
      console.error('Update franchise error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/brands/franchises/[id]
 * Delete a franchise account (Master only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMasterOnly(request, async () => {
    try {
      const { id } = await params;

      // Load existing accounts
      const accounts = loadFranchiseAccounts();

      // Find account to delete
      const accountIndex = accounts.findIndex(acc => acc.id === id);
      if (accountIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Franchise account not found' },
          { status: 404 }
        );
      }

      // Remove account
      accounts.splice(accountIndex, 1);

      // Save to file
      saveFranchiseAccounts(accounts);

      return NextResponse.json({
        success: true,
        message: 'Franchise account deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete franchise error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}
