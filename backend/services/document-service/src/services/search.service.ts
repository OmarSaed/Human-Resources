import { Client } from '@elastic/elasticsearch';
import { createLogger } from '@hrms/shared';

const logger = createLogger('search-service');

export interface SearchConfig {
  node: string;
  username?: string;
  password?: string;
  apiKey?: string;
  index: string;
}

export interface DocumentIndex {
  id: string;
  filename: string;
  originalName: string;
  content: string;
  category: string;
  type: string;
  tags: string[];
  ownerId: string;
  ownerType: string;
  visibility: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query?: string;
  category?: string;
  type?: string;
  tags?: string[];
  ownerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sizeMin?: number;
  sizeMax?: number;
  mimeTypes?: string[];
  visibility?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  documents: Array<DocumentIndex & { score: number; highlights?: any }>;
  total: number;
  page: number;
  totalPages: number;
  aggregations?: Record<string, any>;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  frequency: number;
}

export class SearchService {
  private client: Client;
  private index: string;

  constructor(config: SearchConfig) {
    this.index = config.index;
    this.client = new Client({
      node: config.node,
      auth: config.username && config.password 
        ? { username: config.username, password: config.password }
        : config.apiKey 
        ? { apiKey: config.apiKey }
        : undefined,
    });

    this.initializeIndex();
  }

  /**
   * Initialize Elasticsearch index with mapping
   */
  private async initializeIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: this.index });
      
      if (!indexExists) {
        await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                filename: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                originalName: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { 
                  type: 'text',
                  analyzer: 'standard'
                },
                category: { type: 'keyword' },
                type: { type: 'keyword' },
                tags: { type: 'keyword' },
                ownerId: { type: 'keyword' },
                ownerType: { type: 'keyword' },
                visibility: { type: 'keyword' },
                mimeType: { type: 'keyword' },
                size: { type: 'long' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                metadata: { type: 'object', enabled: false }
              }
            },
            settings: {
              analysis: {
                analyzer: {
                  filename_analyzer: {
                    type: 'custom',
                    tokenizer: 'keyword',
                    filter: ['lowercase']
                  }
                }
              }
            }
          }
        });

        logger.info('Elasticsearch index created', { index: this.index });
      } else {
        logger.info('Elasticsearch index already exists', { index: this.index });
      }
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch index', error as Error);
      throw error;
    }
  }

  /**
   * Index a document for searching
   */
  async indexDocument(document: DocumentIndex): Promise<void> {
    try {
      await this.client.index({
        index: this.index,
        id: document.id,
        body: document,
      });

      logger.info('Document indexed successfully', { 
        id: document.id,
        filename: document.filename 
      });
    } catch (error) {
      logger.error('Failed to index document', error as Error);
      throw error;
    }
  }

  /**
   * Update indexed document
   */
  async updateDocument(id: string, updates: Partial<DocumentIndex>): Promise<void> {
    try {
      await this.client.update({
        index: this.index,
        id,
        body: {
          doc: updates
        }
      });

      logger.info('Document updated in index', { id });
    } catch (error) {
      logger.error('Failed to update document in index', error as Error);
      throw error;
    }
  }

  /**
   * Remove document from index
   */
  async removeDocument(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.index,
        id,
      });

      logger.info('Document removed from index', { id });
    } catch (error) {
      logger.error('Failed to remove document from index', error as Error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: SearchQuery): Promise<SearchResult> {
    try {
      const {
        query: searchQuery,
        category,
        type,
        tags,
        ownerId,
        dateFrom,
        dateTo,
        sizeMin,
        sizeMax,
        mimeTypes,
        visibility,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const mustClauses: any[] = [];
      const filterClauses: any[] = [];

      // Text search
      if (searchQuery) {
        mustClauses.push({
          multi_match: {
            query: searchQuery,
            fields: ['filename^2', 'originalName^2', 'content', 'tags^1.5'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Category filter
      if (category) {
        filterClauses.push({ term: { category } });
      }

      // Type filter
      if (type) {
        filterClauses.push({ term: { type } });
      }

      // Tags filter
      if (tags && tags.length > 0) {
        filterClauses.push({ terms: { tags } });
      }

      // Owner filter
      if (ownerId) {
        filterClauses.push({ term: { ownerId } });
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const dateRange: any = {};
        if (dateFrom) dateRange.gte = dateFrom.toISOString();
        if (dateTo) dateRange.lte = dateTo.toISOString();
        filterClauses.push({ range: { createdAt: dateRange } });
      }

      // Size range filter
      if (sizeMin !== undefined || sizeMax !== undefined) {
        const sizeRange: any = {};
        if (sizeMin !== undefined) sizeRange.gte = sizeMin;
        if (sizeMax !== undefined) sizeRange.lte = sizeMax;
        filterClauses.push({ range: { size: sizeRange } });
      }

      // MIME type filter
      if (mimeTypes && mimeTypes.length > 0) {
        filterClauses.push({ terms: { mimeType: mimeTypes } });
      }

      // Visibility filter
      if (visibility && visibility.length > 0) {
        filterClauses.push({ terms: { visibility } });
      }

      const searchBody: any = {
        query: {
          bool: {
            must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
            filter: filterClauses
          }
        },
        from,
        size: limit,
        sort: [
          { [sortBy]: { order: sortOrder } }
        ],
        highlight: {
          fields: {
            content: {
              fragment_size: 150,
              number_of_fragments: 3
            },
            filename: {},
            originalName: {}
          }
        },
        aggs: {
          categories: {
            terms: { field: 'category' }
          },
          types: {
            terms: { field: 'type' }
          },
          tags: {
            terms: { field: 'tags', size: 20 }
          },
          mimeTypes: {
            terms: { field: 'mimeType' }
          },
          sizeRanges: {
            range: {
              field: 'size',
              ranges: [
                { to: 1024 * 1024, key: 'small' }, // < 1MB
                { from: 1024 * 1024, to: 10 * 1024 * 1024, key: 'medium' }, // 1MB - 10MB
                { from: 10 * 1024 * 1024, key: 'large' } // > 10MB
              ]
            }
          }
        }
      };

      const result = await this.client.search({
        index: this.index,
        body: searchBody
      });

      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0;
      const totalPages = Math.ceil(total / limit);

      const documents = hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score,
        highlights: hit.highlight
      }));

      const aggregations = result.aggregations;

      logger.info('Search completed', {
        query: searchQuery,
        total,
        page,
        limit,
        took: result.took
      });

      return {
        documents,
        total,
        page,
        totalPages,
        aggregations
      };
    } catch (error) {
      logger.error('Search failed', error as Error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(prefix: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const result = await this.client.search({
        index: this.index,
        body: {
          size: 0,
          aggs: {
            suggestions: {
              terms: {
                field: 'tags',
                include: `${prefix}.*`,
                size: limit
              }
            },
            filename_suggestions: {
              terms: {
                field: 'filename.keyword',
                include: `${prefix}.*`,
                size: limit
              }
            }
          }
        }
      });

      const suggestions: SearchSuggestion[] = [];
      const aggregations = result.aggregations;

      // Add tag suggestions
      if (aggregations && (aggregations.suggestions as any)?.buckets) {
        (aggregations.suggestions as any).buckets.forEach((bucket: any) => {
          suggestions.push({
            text: bucket.key,
            score: bucket.doc_count,
            frequency: bucket.doc_count
          });
        });
      }

      // Add filename suggestions
      if (aggregations && (aggregations.filename_suggestions as any)?.buckets) {
        (aggregations.filename_suggestions as any).buckets.forEach((bucket: any) => {
          suggestions.push({
            text: bucket.key,
            score: bucket.doc_count,
            frequency: bucket.doc_count
          });
        });
      }

      // Sort by frequency/score and remove duplicates
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text === suggestion.text)
        )
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, limit);

      return uniqueSuggestions;
    } catch (error) {
      logger.error('Failed to get suggestions', error as Error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    totalDocuments: number;
    documentsPerCategory: Record<string, number>;
    documentsPerType: Record<string, number>;
    topTags: Array<{ tag: string; count: number }>;
    sizeDistribution: Record<string, number>;
  }> {
    try {
      const dateRange = dateFrom && dateTo ? {
        range: {
          createdAt: {
            gte: dateFrom.toISOString(),
            lte: dateTo.toISOString()
          }
        }
      } : undefined;

      const result = await this.client.search({
        index: this.index,
        body: {
          size: 0,
          query: dateRange ? { bool: { filter: [dateRange] } } : { match_all: {} },
          aggs: {
            categories: {
              terms: { field: 'category', size: 50 }
            },
            types: {
              terms: { field: 'type', size: 50 }
            },
            tags: {
              terms: { field: 'tags', size: 20 }
            },
            sizeRanges: {
              range: {
                field: 'size',
                ranges: [
                  { to: 1024 * 1024, key: 'small' },
                  { from: 1024 * 1024, to: 10 * 1024 * 1024, key: 'medium' },
                  { from: 10 * 1024 * 1024, key: 'large' }
                ]
              }
            }
          }
        }
      });

      const aggregations = result.aggregations;
      const totalDocuments = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0;

      const documentsPerCategory: Record<string, number> = {};
      if (aggregations && (aggregations.categories as any)?.buckets) {
        (aggregations.categories as any).buckets.forEach((bucket: any) => {
          documentsPerCategory[bucket.key] = bucket.doc_count;
        });
      }

      const documentsPerType: Record<string, number> = {};
      if (aggregations && (aggregations.types as any)?.buckets) {
        (aggregations.types as any).buckets.forEach((bucket: any) => {
          documentsPerType[bucket.key] = bucket.doc_count;
        });
      }

      const topTags = aggregations && (aggregations.tags as any)?.buckets ? (aggregations.tags as any).buckets.map((bucket: any) => ({
        tag: bucket.key,
        count: bucket.doc_count,
      })) : [];

      const sizeDistribution: Record<string, number> = {};
      if (aggregations && (aggregations.sizeRanges as any)?.buckets) {
        (aggregations.sizeRanges as any).buckets.forEach((bucket: any) => {
          sizeDistribution[bucket.key] = bucket.doc_count;
        });
      }

      return {
        totalDocuments,
        documentsPerCategory,
        documentsPerType,
        topTags,
        sizeDistribution
      };
    } catch (error) {
      logger.error('Failed to get search analytics', error as Error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndexDocuments(documents: DocumentIndex[]): Promise<void> {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: this.index, _id: doc.id } },
        doc
      ]);

      const result = await this.client.bulk({ body });

      if (result.errors) {
        logger.error('Bulk indexing had errors', { 
          errors: result.items.filter((item: any) => item.index.error)
        });
      } else {
        logger.info('Bulk indexing completed successfully', { 
          count: documents.length 
        });
      }
    } catch (error) {
      logger.error('Bulk indexing failed', error as Error);
      throw error;
    }
  }

  /**
   * Clear all documents from index
   */
  async clearIndex(): Promise<void> {
    try {
      await this.client.deleteByQuery({
        index: this.index,
        body: {
          query: { match_all: {} }
        }
      });

      logger.info('Index cleared successfully');
    } catch (error) {
      logger.error('Failed to clear index', error as Error);
      throw error;
    }
  }
}
