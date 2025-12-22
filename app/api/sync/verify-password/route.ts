/**
 * API Route for Password-Protected Data Sync
 * 
 * POST /api/sync/verify-password - Verify password for data sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeIncrementalSync } from '@/lib/sync/weekly-data-sync';

// Password stored as environment variable or default
const SYNC_PASSWORD = process.env.DATA_SYNC_PASSWORD || '0614';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required',
        },
        { status: 400 }
      );
    }

    // Verify password
    if (password !== SYNC_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid password',
        },
        { status: 401 }
      );
    }

    console.log('[Data Sync] Valid password provided, executing incremental sync...');
    const result = await executeIncrementalSync();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[Data Sync] Error executing sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute sync',
      },
      { status: 500 }
    );
  }
}
