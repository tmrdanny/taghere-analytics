import { MongoClient, Db } from 'mongodb';
import fs from 'fs';

// Load environment variables if not already loaded (for standalone scripts)
if (!process.env.MONGODB_URI && typeof window === 'undefined') {
  try {
    const { config } = require('dotenv');
    const { resolve } = require('path');
    config({ path: resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // dotenv not available or already loaded by Next.js
  }
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'taghere';

// X.509 Certificate configuration
const certPath = process.env.MONGODB_CERT_PATH;

const options: any = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
};

// Add X.509 certificate if path is provided
if (certPath) {
  try {
    options.tls = true;
    options.tlsCertificateKeyFile = certPath;
    console.log('[MongoDB] Using X.509 certificate authentication');
  } catch (error) {
    console.error('[MongoDB] Error reading certificate file:', error);
    throw new Error('Failed to read X.509 certificate file');
  }
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value across module reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Get MongoDB client instance
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Get MongoDB database instance
 */
export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

/**
 * Get read-only MongoDB client (if configured)
 * Falls back to main connection if not configured
 */
export async function getReadOnlyDb(): Promise<Db> {
  if (process.env.MONGODB_READONLY_URI) {
    const readOnlyClient = new MongoClient(process.env.MONGODB_READONLY_URI, {
      ...options,
      readPreference: 'secondaryPreferred',
    });
    await readOnlyClient.connect();
    return readOnlyClient.db(dbName);
  }
  return getDb();
}

export default clientPromise;
