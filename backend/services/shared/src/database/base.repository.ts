import { PaginationParams, BaseEntity } from '../types';

/**
 * Query options for repository operations
 */
export interface QueryOptions {
  transaction?: any;
  include?: string[];
  select?: string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
  where?: Record<string, any>;
}

/**
 * Pagination result interface
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Re-export types for convenience
export type { PaginationParams, BaseEntity } from '../types';

/**
 * Base repository interface defining common CRUD operations
 */
export interface IBaseRepository<T extends BaseEntity> {
  // Create operations
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options?: QueryOptions): Promise<T>;
  createMany(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: QueryOptions): Promise<T[]>;

  // Read operations
  findById(id: string, options?: QueryOptions): Promise<T | null>;
  findOne(where: Partial<T>, options?: QueryOptions): Promise<T | null>;
  findMany(where?: Partial<T>, options?: QueryOptions): Promise<T[]>;
  findWithPagination(
    where: Partial<T>, 
    pagination: PaginationParams, 
    options?: QueryOptions
  ): Promise<PaginationResult<T>>;

  // Update operations
  update(id: string, data: Partial<T>, options?: QueryOptions): Promise<T>;
  updateMany(where: Partial<T>, data: Partial<T>, options?: QueryOptions): Promise<number>;

  // Delete operations
  delete(id: string, options?: QueryOptions): Promise<void>;
  deleteMany(where: Partial<T>, options?: QueryOptions): Promise<number>;
  softDelete(id: string, options?: QueryOptions): Promise<T>;

  // Utility operations
  count(where?: Partial<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
  restore(id: string, options?: QueryOptions): Promise<T>;

  // Bulk operations
  bulkCreate(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: QueryOptions): Promise<T[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>, options?: QueryOptions): Promise<T[]>;
  bulkDelete(ids: string[], options?: QueryOptions): Promise<void>;
}

/**
 * Abstract base repository implementation
 */
export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected abstract tableName: string;
  protected abstract dbClient: any;

  /**
   * Create a new entity
   */
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options?: QueryOptions): Promise<T>;

  /**
   * Create multiple entities
   */
  abstract createMany(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: QueryOptions): Promise<T[]>;

  /**
   * Find entity by ID
   */
  abstract findById(id: string, options?: QueryOptions): Promise<T | null>;

  /**
   * Find single entity by criteria
   */
  abstract findOne(where: Partial<T>, options?: QueryOptions): Promise<T | null>;

  /**
   * Find multiple entities by criteria
   */
  abstract findMany(where?: Partial<T>, options?: QueryOptions): Promise<T[]>;

  /**
   * Find entities with pagination
   */
  abstract findWithPagination(
    where: Partial<T>, 
    pagination: PaginationParams, 
    options?: QueryOptions
  ): Promise<PaginationResult<T>>;

  /**
   * Update entity by ID
   */
  abstract update(id: string, data: Partial<T>, options?: QueryOptions): Promise<T>;

  /**
   * Update multiple entities
   */
  abstract updateMany(where: Partial<T>, data: Partial<T>, options?: QueryOptions): Promise<number>;

  /**
   * Hard delete entity by ID
   */
  abstract delete(id: string, options?: QueryOptions): Promise<void>;

  /**
   * Hard delete multiple entities
   */
  abstract deleteMany(where: Partial<T>, options?: QueryOptions): Promise<number>;

  /**
   * Soft delete entity by ID
   */
  abstract softDelete(id: string, options?: QueryOptions): Promise<T>;

  /**
   * Count entities matching criteria
   */
  abstract count(where?: Partial<T>): Promise<number>;

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  /**
   * Restore soft-deleted entity
   */
  abstract restore(id: string, options?: QueryOptions): Promise<T>;

  /**
   * Bulk create entities
   */
  async bulkCreate(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: QueryOptions): Promise<T[]> {
    return this.createMany(data, options);
  }

  /**
   * Bulk update entities
   */
  abstract bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>, options?: QueryOptions): Promise<T[]>;

  /**
   * Bulk delete entities
   */
  async bulkDelete(ids: string[], options?: QueryOptions): Promise<void> {
    for (const id of ids) {
      await this.delete(id, options);
    }
  }

  /**
   * Execute within transaction
   */
  abstract withTransaction<R>(callback: (transaction: any) => Promise<R>): Promise<R>;

  /**
   * Generate UUID for new entities
   */
  protected generateId(): string {
    return require('uuid').v4();
  }

  /**
   * Apply pagination to query
   */
  protected applyPagination(pagination: PaginationParams) {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 20));
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      skip: offset,
      take: limit,
    };
  }

  /**
   * Build pagination result
   */
  protected buildPaginationResult<T>(
    data: T[],
    total: number,
    pagination: PaginationParams
  ): PaginationResult<T> {
    const { page, limit } = this.applyPagination(pagination);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Apply sorting to query
   */
  protected applySorting(pagination: PaginationParams) {
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    
    if (pagination.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'asc';
    } else {
      orderBy['createdAt'] = 'desc'; // Default sort
    }

    return orderBy;
  }

  /**
   * Build where clause excluding soft-deleted records
   */
  protected buildWhereClause(where?: Partial<T>, includeSoftDeleted: boolean = false) {
    const whereClause = { ...where };
    
    if (!includeSoftDeleted) {
      (whereClause as any).deletedAt = null;
    }

    return whereClause;
  }
}
