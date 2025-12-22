/**
 * Field mappings configuration
 * Auto-detected from MongoDB schema exploration
 */

export const FIELD_MAPPINGS = {
  bills: {
    // Standard field -> Actual MongoDB field
    storeId: 'storeOID',
    createdAt: 'date',
    totalAmount: 'resultPrice',
    items: 'items',
    type: 'type',
    userId: 'userOID',
  },
  stores: {
    storeId: '_id',
    storeName: 'label',
    name: 'name',
    location: 'location',
    phone: 'phone',
  },
} as const;

/**
 * Helper to get mapped field name
 */
export function getMappedField(collection: 'bills' | 'stores', standardField: string): string {
  return (FIELD_MAPPINGS[collection] as any)[standardField] || standardField;
}
