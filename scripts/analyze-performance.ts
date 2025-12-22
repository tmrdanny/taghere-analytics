/**
 * Performance analysis script
 * Analyzes query performance and data distribution
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { getDb } from '../lib/mongodb';

async function analyzePerformance() {
  try {
    const db = await getDb();
    const billsCollection = db.collection('bills');

    console.log('=== Performance Analysis ===\n');

    // 1. Total document count
    const totalCount = await billsCollection.countDocuments();
    console.log(`📊 Total bills: ${totalCount.toLocaleString()}`);

    // 2. Date range analysis
    console.log('\n📅 Date Range Analysis:');

    const dateRange = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $group: {
          _id: null,
          minDate: { $min: '$dateOnly' },
          maxDate: { $max: '$dateOnly' },
          dates: { $addToSet: '$dateOnly' }
        }
      }
    ]).toArray();

    if (dateRange[0]) {
      console.log(`  Min date: ${dateRange[0].minDate}`);
      console.log(`  Max date: ${dateRange[0].maxDate}`);
      console.log(`  Total unique dates: ${dateRange[0].dates.length}`);
    }

    // 3. Test query performance - Last 7 days
    console.log('\n⏱️  Query Performance Tests:\n');

    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Test 1: Count documents in last 7 days
    console.log(`Test 1: Count last 7 days (${sevenDaysAgo} to ${today})`);
    const start1 = Date.now();

    const count7Days = await billsCollection.countDocuments({
      $expr: {
        $and: [
          { $gte: [{ $substr: ['$date', 0, 10] }, sevenDaysAgo] },
          { $lte: [{ $substr: ['$date', 0, 10] }, today] }
        ]
      }
    });

    const time1 = Date.now() - start1;
    console.log(`  Documents: ${count7Days.toLocaleString()}`);
    console.log(`  Time: ${time1}ms`);
    console.log(`  Performance: ${count7Days > 0 ? (time1 / count7Days).toFixed(2) : 0}ms per document\n`);

    // Test 2: Aggregation with grouping (simplified dashboard query)
    console.log('Test 2: Simple aggregation (group by date)');
    const start2 = Date.now();

    const dailyStats = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $match: {
          dateOnly: {
            $gte: sevenDaysAgo,
            $lte: today
          }
        }
      },
      {
        $group: {
          _id: '$dateOnly',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$resultPrice' } }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const time2 = Date.now() - start2;
    console.log(`  Result: ${dailyStats.length} days`);
    console.log(`  Time: ${time2}ms\n`);

    // Test 3: With store lookup (full dashboard query simulation)
    console.log('Test 3: With store lookup');
    const start3 = Date.now();

    const withLookup = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $match: {
          dateOnly: {
            $gte: sevenDaysAgo,
            $lte: today
          }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeOID',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalGMV: { $sum: { $toDouble: '$resultPrice' } }
        }
      }
    ]).toArray();

    const time3 = Date.now() - start3;
    console.log(`  Time: ${time3}ms`);
    if (withLookup[0]) {
      console.log(`  Total orders: ${withLookup[0].totalOrders.toLocaleString()}`);
      console.log(`  Total GMV: ₩${Math.round(withLookup[0].totalGMV).toLocaleString()}`);
    }
    console.log('');

    // 4. Index usage analysis
    console.log('📈 Index Usage:');
    const explain = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $match: {
          dateOnly: {
            $gte: sevenDaysAgo,
            $lte: today
          }
        }
      },
      { $limit: 1 }
    ]).explain('executionStats');

    console.log(`  Execution time: ${explain.executionStats.executionTimeMillis}ms`);
    console.log(`  Documents examined: ${explain.executionStats.totalDocsExamined.toLocaleString()}`);
    console.log(`  Documents returned: ${explain.executionStats.nReturned}`);
    console.log(`  Index used: ${explain.executionStats.executionStages?.inputStage?.indexName || 'COLLSCAN (no index)'}`);

    // 5. Daily volume analysis
    console.log('\n📊 Daily Volume (last 30 days):');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const dailyVolume = await billsCollection.aggregate([
      {
        $addFields: {
          dateOnly: { $substr: ['$date', 0, 10] }
        }
      },
      {
        $match: {
          dateOnly: {
            $gte: thirtyDaysAgo,
            $lte: today
          }
        }
      },
      {
        $group: {
          _id: '$dateOnly',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]).toArray();

    dailyVolume.forEach(day => {
      console.log(`  ${day._id}: ${day.count.toLocaleString()} orders`);
    });

    // 6. Recommendations
    console.log('\n💡 Performance Recommendations:\n');

    if (time3 > 3000) {
      console.log('⚠️  SLOW QUERY DETECTED (>3s)');
      console.log('   Recommendations:');
      console.log('   1. Consider pre-aggregation for faster queries');
      console.log('   2. Reduce date range (currently testing 7 days)');
      console.log('   3. Increase cache TTL to reduce MongoDB hits');
      console.log('   4. Consider separating hot/cold data');
    } else if (time3 > 1000) {
      console.log('⚠️  MODERATE PERFORMANCE (1-3s)');
      console.log('   Recommendations:');
      console.log('   1. Cache is essential (already enabled)');
      console.log('   2. Monitor query times during peak hours');
      console.log('   3. Consider pre-aggregation if usage increases');
    } else {
      console.log('✅ GOOD PERFORMANCE (<1s)');
      console.log('   Current setup is optimal for your data volume.');
    }

    console.log(`\n   Data volume: ${count7Days.toLocaleString()} documents/7 days`);
    console.log(`   Avg documents/day: ${Math.round(count7Days / 7).toLocaleString()}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

analyzePerformance();
