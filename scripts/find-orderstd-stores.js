const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function findOrderStdStores() {
  const certPath = process.env.MONGODB_CERT_PATH;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  const client = new MongoClient(uri, {
    tls: true,
    tlsCertificateKeyFile: certPath,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const stores = db.collection('stores');

    const orderStdStores = await stores.find({
      'pricingPlan.orderStd': true
    }).toArray();

    console.log(`Found ${orderStdStores.length} stores with orderStd pricing plan\n`);

    if (orderStdStores.length > 0) {
      console.log('Store Details:');
      orderStdStores.forEach((store, idx) => {
        console.log(`${idx + 1}. ${store._id.toString()} - ${store.label || 'No Name'}`);
      });

      // Output as JSON array for group creation
      const storeIds = orderStdStores.map(s => s._id.toString());
      console.log('\n--- Store IDs (JSON Array) ---');
      console.log(JSON.stringify(storeIds, null, 2));

      // Output for localStorage group
      const groupData = {
        id: 'group-orderstd-' + Date.now(),
        name: '선결제 매장 (orderStd)',
        storeIds: storeIds,
        color: 'blue',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('\n--- Group Data (for localStorage) ---');
      console.log(JSON.stringify(groupData, null, 2));
    } else {
      console.log('No stores found with pricingPlan.orderStd = true');
    }

  } finally {
    await client.close();
  }
}

findOrderStdStores().catch(console.error);
