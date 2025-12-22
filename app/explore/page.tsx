'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Search, Table, UtensilsCrossed } from 'lucide-react';
import { MenuStoreSearch } from '@/components/menu-search/MenuStoreSearch';

interface CollectionSchema {
  name: string;
  documentCount: number;
  sampleSize: number;
  fields: Array<{
    name: string;
    types: string[];
    sampleValues: any[];
    nullCount: number;
  }>;
  indexes: any[];
}

export default function ExplorePage() {
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [schema, setSchema] = useState<CollectionSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/explore?action=list');
      const data = await response.json();

      if (data.success) {
        setCollections(data.collections);
      } else {
        setError(data.error || 'Failed to load collections');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exploreCollection = async (collectionName: string) => {
    if (!collectionName) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/explore?action=explore-one&collection=${encodeURIComponent(
          collectionName
        )}&sampleSize=20`
      );
      const data = await response.json();

      if (data.success) {
        setSchema(data.collection);
      } else {
        setError(data.error || 'Failed to explore collection');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    exploreCollection(value);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-8 w-8" />
            탐색 & 검색
          </h1>
          <p className="text-muted-foreground mt-1">
            메뉴로 매장 검색, 스키마 탐색
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="menu-search" className="space-y-4">
          <TabsList>
            <TabsTrigger value="menu-search" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              메뉴 검색
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              스키마 탐색
            </TabsTrigger>
          </TabsList>

          {/* Menu Search Tab */}
          <TabsContent value="menu-search">
            <MenuStoreSearch />
          </TabsContent>

          {/* Schema Explorer Tab */}
          <TabsContent value="schema" className="space-y-6">
            {/* Collection Load Button */}
            {collections.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <Button onClick={loadCollections} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Loading...' : 'Load Collections'}
                  </Button>
                </CardContent>
              </Card>
            )}

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Collection Selector */}
        {collections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Collection</CardTitle>
              <CardDescription>
                Found {collections.length} collections in your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedCollection} onValueChange={handleCollectionChange}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Select a collection to explore..." />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((name) => (
                    <SelectItem key={name} value={name}>
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        {name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Schema Display */}
        {schema && (
          <>
            {/* Collection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  {schema.name}
                </CardTitle>
                <CardDescription>
                  ~{schema.documentCount.toLocaleString()} documents (sampled{' '}
                  {schema.sampleSize})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {schema.documentCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Documents
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{schema.fields.length}</div>
                    <div className="text-sm text-muted-foreground">
                      Fields Detected
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{schema.indexes.length}</div>
                    <div className="text-sm text-muted-foreground">Indexes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Fields ({schema.fields.length})</CardTitle>
                <CardDescription>
                  Field types and sample values from {schema.sampleSize} documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Field Name</th>
                        <th className="text-left py-2 px-4 font-medium">Type(s)</th>
                        <th className="text-left py-2 px-4 font-medium">Sample Values</th>
                        <th className="text-left py-2 px-4 font-medium">Nulls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.fields.map((field) => (
                        <tr key={field.name} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-mono text-xs">
                            {field.name}
                          </td>
                          <td className="py-2 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {field.types.join(' | ')}
                            </code>
                          </td>
                          <td className="py-2 px-4 text-xs text-muted-foreground max-w-md truncate">
                            {field.sampleValues.length > 0
                              ? field.sampleValues
                                  .map((v) =>
                                    typeof v === 'object'
                                      ? JSON.stringify(v)
                                      : String(v)
                                  )
                                  .join(', ')
                              : '-'}
                          </td>
                          <td className="py-2 px-4 text-xs">
                            {field.nullCount > 0 ? field.nullCount : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Indexes */}
            <Card>
              <CardHeader>
                <CardTitle>Indexes ({schema.indexes.length})</CardTitle>
                <CardDescription>
                  Database indexes for query optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schema.indexes.map((index, i) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{index.name || 'unnamed'}</div>
                          <code className="text-xs text-muted-foreground">
                            {JSON.stringify(index.key)}
                          </code>
                        </div>
                        {index.unique && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            UNIQUE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Loading...</span>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
