import { Db, Collection } from 'mongodb';
import { getDb } from './mongodb';

export interface FieldInfo {
  name: string;
  types: Set<string>;
  sampleValues: any[];
  nullCount: number;
}

export interface CollectionInfo {
  name: string;
  documentCount: number;
  sampleSize: number;
  fields: Map<string, FieldInfo>;
  indexes: any[];
}

/**
 * Safely get field type name
 */
function getTypeName(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

/**
 * Recursively extract fields from a document
 */
function extractFields(
  doc: any,
  prefix: string = '',
  fields: Map<string, FieldInfo>
): void {
  if (!doc || typeof doc !== 'object') return;

  for (const [key, value] of Object.entries(doc)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (!fields.has(fieldName)) {
      fields.set(fieldName, {
        name: fieldName,
        types: new Set(),
        sampleValues: [],
        nullCount: 0,
      });
    }

    const fieldInfo = fields.get(fieldName)!;
    const typeName = getTypeName(value);
    fieldInfo.types.add(typeName);

    if (value === null) {
      fieldInfo.nullCount++;
    } else if (fieldInfo.sampleValues.length < 3) {
      // Store max 3 sample values
      if (typeName === 'object' && !Array.isArray(value)) {
        fieldInfo.sampleValues.push('[Object]');
      } else if (typeName === 'array' && Array.isArray(value)) {
        fieldInfo.sampleValues.push(`[Array(${value.length})]`);
      } else {
        fieldInfo.sampleValues.push(value);
      }
    }

    // Recursively explore nested objects (limited depth)
    if (typeName === 'object' && !prefix.includes('.')) {
      extractFields(value, fieldName, fields);
    }
  }
}

/**
 * Explore a single collection structure
 * Uses safe sampling (limit + projection) to avoid unbounded queries
 */
export async function exploreCollection(
  db: Db,
  collectionName: string,
  sampleSize: number = 20
): Promise<CollectionInfo> {
  const collection: Collection = db.collection(collectionName);

  // Get document count (estimated for large collections)
  const documentCount = await collection.estimatedDocumentCount();

  // Get indexes
  const indexes = await collection.indexes();

  // Sample documents safely
  const fields = new Map<string, FieldInfo>();

  // Use find with limit instead of $sample to be safer
  const samples = await collection
    .find({})
    .limit(sampleSize)
    .toArray();

  // Extract fields from samples
  samples.forEach((doc) => {
    extractFields(doc, '', fields);
  });

  return {
    name: collectionName,
    documentCount,
    sampleSize: samples.length,
    fields,
    indexes,
  };
}

/**
 * List all collections in the database
 */
export async function listCollections(db: Db): Promise<string[]> {
  const collections = await db.listCollections().toArray();
  return collections.map((c) => c.name);
}

/**
 * Explore entire database schema
 * Safe implementation with limits
 */
export async function exploreDatabase(
  sampleSize: number = 20
): Promise<Map<string, CollectionInfo>> {
  const db = await getDb();
  const collectionNames = await listCollections(db);

  const result = new Map<string, CollectionInfo>();

  for (const name of collectionNames) {
    // Skip system collections
    if (name.startsWith('system.')) continue;

    try {
      const info = await exploreCollection(db, name, sampleSize);
      result.set(name, info);
    } catch (error) {
      console.error(`Error exploring collection ${name}:`, error);
    }
  }

  return result;
}

/**
 * Format collection info for display
 */
export function formatCollectionInfo(info: CollectionInfo): string {
  let output = `\n=== Collection: ${info.name} ===\n`;
  output += `Documents: ~${info.documentCount.toLocaleString()}\n`;
  output += `Sampled: ${info.sampleSize} documents\n\n`;

  output += `Fields (${info.fields.size}):\n`;

  const sortedFields = Array.from(info.fields.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedFields.forEach((field) => {
    const types = Array.from(field.types).join(' | ');
    const samples =
      field.sampleValues.length > 0
        ? ` (e.g., ${field.sampleValues.slice(0, 2).join(', ')})`
        : '';
    const nullInfo = field.nullCount > 0 ? ` [${field.nullCount} nulls]` : '';
    output += `  ${field.name}: ${types}${samples}${nullInfo}\n`;
  });

  output += `\nIndexes (${info.indexes.length}):\n`;
  info.indexes.forEach((index) => {
    const keys = Object.keys(index.key).join(', ');
    output += `  ${index.name || 'unnamed'}: { ${keys} }${
      index.unique ? ' [unique]' : ''
    }\n`;
  });

  return output;
}

/**
 * Check if a query will use an index (safe explain)
 */
export async function explainQuery(
  collectionName: string,
  filter: any
): Promise<any> {
  const db = await getDb();
  const collection = db.collection(collectionName);

  return collection.find(filter).limit(1).explain();
}
