import { AuthSession } from '@/lib/types/auth';

/**
 * Enforce store access control based on user role
 *
 * - Master: Returns requestedStoreIds as-is (full access)
 * - Franchise: Filters to only assigned stores
 *
 * @param session - Current user session
 * @param requestedStoreIds - Store IDs requested by the client
 * @returns Filtered store IDs that the user is allowed to access
 */
export function enforceStoreAccess(
  session: AuthSession,
  requestedStoreIds?: string[]
): string[] | undefined {
  // Master has full access to all stores
  if (session.role === 'master') {
    return requestedStoreIds;
  }

  // Franchise account: only assigned stores
  const assignedStoreIds = session.assignedStoreIds || [];

  // If no specific stores requested, return all assigned stores
  if (!requestedStoreIds || requestedStoreIds.length === 0) {
    return assignedStoreIds;
  }

  // Filter requested stores to only include assigned ones
  const allowedStoreIds = requestedStoreIds.filter(storeId =>
    assignedStoreIds.includes(storeId)
  );

  return allowedStoreIds;
}

/**
 * Check if a user has access to a specific store
 */
export function hasStoreAccess(
  session: AuthSession,
  storeId: string
): boolean {
  if (session.role === 'master') {
    return true;
  }

  const assignedStoreIds = session.assignedStoreIds || [];
  return assignedStoreIds.includes(storeId);
}
