export interface StoreGroup {
  id: string;              // UUID v4
  name: string;            // e.g., "강남지역", "신규매장"
  storeIds: string[];      // MongoDB ObjectId strings
  color?: string;          // Optional badge color
  createdAt: string;       // ISO timestamp
  updatedAt: string;
}

export interface StoreInfo {
  storeId: string;
  storeName: string;
  location?: string;
}
