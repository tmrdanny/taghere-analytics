# MongoDB Schema Detection and Field Mapping

This document explains how the analytics dashboard automatically detects and adapts to your MongoDB schema.

## Overview

The dashboard uses automatic schema detection to discover the actual field names in your MongoDB collections and adapts the aggregation pipeline accordingly. This eliminates the need for manual field mapping configuration.

## Detected Schema

### Bills Collection (`bills`)

Total documents: **7,630,368**

| Standard Field | Actual MongoDB Field | Type | Sample Value |
|---------------|---------------------|------|--------------|
| storeId | `storeOID` | ObjectId | `ObjectId("63a02535...")` |
| createdAt | `date` | string | `"2023-03-24 17:36:13"` |
| totalAmount | `resultPrice` | string | `"3500"` |
| items | `items` | string (JSON) | `'[{"label":"아이스 아메리카노","price":"3500","count":1}]'` |
| userId | `userOID` | ObjectId | `ObjectId("641d607e...")` |
| type | `type` | string | `"menu"` |

**Key Schema Characteristics:**
- Dates are stored as strings in format: `"YYYY-MM-DD HH:mm:ss"`
- Prices are stored as strings, not numbers
- Items are stored as JSON-encoded strings, not arrays
- Store references use ObjectId field `storeOID`

### Stores Collection (`stores`)

Total documents: **2,101**

| Standard Field | Actual MongoDB Field | Type | Sample Value |
|---------------|---------------------|------|--------------|
| storeId | `_id` | ObjectId | `ObjectId("636d45f0...")` |
| storeName | `label` | string | `"얼스어스"` |
| name | `name` | string | `"earth-us"` |
| location | `location` | string | `"서울 마포구 성미산로 150"` |
| phone | `phone` | string | `"0507-1341-9413"` |

## How Schema Detection Works

### 1. Exploration Script

Run the schema exploration script to analyze your collections:

```bash
npm run explore
```

This script:
- Samples 50 documents from the `bills` collection
- Samples 20 documents from the `stores` collection
- Detects field names, types, and sample values
- Suggests field mappings using fuzzy matching

### 2. Field Mapping Configuration

Detected mappings are stored in [`lib/config/field-mappings.ts`](../lib/config/field-mappings.ts):

```typescript
export const FIELD_MAPPINGS = {
  bills: {
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
}
```

### 3. Automatic Pipeline Adaptation

The aggregation pipeline automatically uses the correct field names:

**Date Filtering:**
```javascript
// Instead of: createdAt: { $gte: startDate, $lt: endDate }
// We use:
{
  $addFields: {
    dateOnly: { $substr: ['$date', 0, 10] }
  }
},
{
  $match: {
    dateOnly: { $gte: startDateStr, $lt: endDateStr }
  }
}
```

**Price Conversion:**
```javascript
// Convert string to number
gmv: { $sum: { $toDouble: '$resultPrice' } }
```

**Store Lookup:**
```javascript
{
  $lookup: {
    from: 'stores',
    localField: 'storeOID',
    foreignField: '_id',
    as: 'storeInfo'
  }
}
```

## Schema-Specific Adaptations

### 1. Date Handling

**Challenge:** Dates are stored as strings, not Date objects

**Solution:**
- Extract date portion using `$substr: ['$date', 0, 10]`
- Extract hour using `$substr: ['$date', 11, 2]`
- Convert to Date objects using `$dateFromString` in final projection

### 2. Price/Amount Handling

**Challenge:** Prices are stored as strings

**Solution:**
- Convert to numbers using `$toDouble: '$resultPrice'`
- Perform arithmetic operations after conversion

### 3. Items/Menu Handling

**Challenge:** Items are stored as JSON-encoded strings, not arrays

**Current Solution:**
- Group by unique items string
- Use items string as temporary menuId
- Display aggregated metrics per item combination

**Future Enhancement:**
- Consider parsing JSON in application layer for better menu-level analytics
- Or create a separate menu reference collection

### 4. Missing Fields

**status field:** Not found in schema
- **Impact:** Cannot filter by order status
- **Solution:** Assume all bills in collection are valid/completed orders

**storeName field:** Not found in bills collection
- **Impact:** Need to perform lookup
- **Solution:** Use `$lookup` to join with stores collection using `storeOID`

## Running Aggregations

### Prerequisites

⚠️ **Important:** The read-only certificate (`read_only.pem`) cannot run aggregations or create indexes.

You need a **write-enabled certificate** or **read-write user** to:
1. Create indexes: `npm run setup-indexes`
2. Run aggregations: `npm run aggregate`

### Option 1: Use Write Certificate (Recommended)

1. Get a read-write X.509 certificate from MongoDB Atlas
2. Update `.env.local`:
   ```env
   MONGODB_CERT_PATH=/path/to/read_write.pem
   ```
3. Run aggregation:
   ```bash
   npm run aggregate
   ```

### Option 2: Create Indexes Manually in Atlas

1. Go to MongoDB Atlas Console
2. Navigate to Collections → Indexes
3. Create the following indexes:

**metrics_daily_store:**
- `{ storeId: 1, date: 1 }` (unique)
- `{ date: 1 }`
- `{ storeId: 1 }`

**metrics_daily_store_menu:**
- `{ storeId: 1, menuId: 1, date: 1 }` (unique)
- `{ date: 1 }`
- `{ storeId: 1 }`

**metrics_hourly_store:**
- `{ storeId: 1, datetime: 1 }` (unique)
- `{ datetime: 1 }`

4. Use write-enabled credentials for aggregation

## Environment Configuration

```env
# Source Collections
COLLECTION_ORDERS=bills      # Contains order/bill data
COLLECTION_PAYMENTS=bills    # Same as orders (no separate payment collection)
COLLECTION_MENUS=stores      # Contains store information
```

## Verification

After running aggregation, verify the results:

```javascript
// Check metrics_daily_store
db.metrics_daily_store.findOne()
// Expected output:
{
  storeId: ObjectId("..."),
  storeName: "얼스어스",
  date: ISODate("2023-03-24T00:00:00.000Z"),
  gmv: 125000,
  paidAmount: 125000,
  orderCount: 35,
  avgOrderValue: 3571.43,
  successfulPayments: 35,
  failedPayments: 0,
  paymentSuccessRate: 1.0,
  updatedAt: ISODate("2024-01-15T...")
}
```

## Troubleshooting

### "not authorized to execute command { aggregate }"

**Cause:** Using read-only certificate

**Solution:** Use write-enabled certificate or credentials

### "Unknown operator: $toDouble"

**Cause:** MongoDB version < 4.0

**Solution:** Upgrade MongoDB or use `$convert` operator instead

### No data in metrics collections

**Possible causes:**
1. Date range is outside available data range
2. Field mappings are incorrect
3. Aggregation pipeline error

**Debug steps:**
```bash
# 1. Check raw data
db.bills.findOne()

# 2. Check date range
db.bills.aggregate([
  { $group: { _id: null, minDate: { $min: "$date" }, maxDate: { $max: "$date" } } }
])

# 3. Run aggregation with recent dates
npm run aggregate
```

## Data Quality Notes

Based on the schema exploration:

1. **Date Range:** 2023-03-24 to present (check actual max date)
2. **Total Bills:** 7,630,368 records
3. **Total Stores:** 2,101 active stores
4. **Data Completeness:**
   - ✅ All bills have `storeOID`, `date`, `resultPrice`
   - ✅ All bills have `items` data
   - ⚠️  Some stores may not have `label` (will show "Unknown Store")
   - ⚠️  No order status field (cannot filter cancelled orders)

## Next Steps

1. ✅ Schema detection completed
2. ✅ Aggregation pipeline adapted
3. ⏳ Obtain write-enabled certificate
4. ⏳ Run aggregations
5. ⏳ Verify dashboard displays data correctly

## References

- [Schema Explorer](../lib/schema-explorer.ts)
- [Field Mappings](../lib/config/field-mappings.ts)
- [Aggregation Pipeline](../lib/aggregation/pipeline.ts)
- [X.509 Authentication Guide](./X509_AUTHENTICATION.md)
