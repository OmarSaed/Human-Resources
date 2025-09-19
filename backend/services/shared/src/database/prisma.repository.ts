import { PrismaClient } from '@prisma/client';
import { BaseRepository, BaseEntity, QueryOptions, PaginationParams, PaginationResult } from './base.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('prisma-repository');

/**
 * Prisma-specific repository implementation
 */
export abstract class PrismaRepository<T extends BaseEntity> extends BaseRepository<T> {
  protected dbClient: PrismaClient;
  protected abstract modelName: string;

  constructor(prismaClient: PrismaClient) {
    super();
    this.dbClient = prismaClient;
  }

  /**
   * Get Prisma model for this repository
   */
  protected get model() {
    return (this.dbClient as any)[this.modelName];
  }

  /**
   * Create a new entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options?: QueryOptions): Promise<T> {
    try {
      const createData = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.model.create({
        data: createData,
        include: options?.include ? this.buildInclude(options.include) : undefined,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Created ${this.modelName}`, { id: result.id });
      return result;
    } catch (error) {
      logger.error(`Failed to create ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Create multiple entities
   */
  async createMany(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: QueryOptions): Promise<T[]> {
    try {
      const createData = data.map(item => ({
        ...item,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await this.model.createMany({
        data: createData,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Created ${result.count} ${this.modelName} records`);
      
      // Return created records (Prisma createMany doesn't return data)
      const ids = createData.map(item => item.id);
      return this.findMany({ id: { in: ids } } as any, options);
    } catch (error) {
      logger.error(`Failed to create multiple ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    try {
      const result = await this.model.findUnique({
        where: { id },
        include: options?.include ? this.buildInclude(options.include) : undefined,
        select: options?.select ? this.buildSelect(options.select) : undefined,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} by ID`, error as Error);
      throw error;
    }
  }

  /**
   * Find single entity by criteria
   */
  async findOne(where: Partial<T>, options?: QueryOptions): Promise<T | null> {
    try {
      const whereClause = this.buildWhereClause(where);
      
      const result = await this.model.findFirst({
        where: whereClause,
        include: options?.include ? this.buildInclude(options.include) : undefined,
        select: options?.select ? this.buildSelect(options.select) : undefined,
        orderBy: options?.orderBy || { createdAt: 'desc' },
      });

      return result;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Find multiple entities by criteria
   */
  async findMany(where?: Partial<T>, options?: QueryOptions): Promise<T[]> {
    try {
      const whereClause = this.buildWhereClause(where);
      
      const result = await this.model.findMany({
        where: whereClause,
        include: options?.include ? this.buildInclude(options.include) : undefined,
        select: options?.select ? this.buildSelect(options.select) : undefined,
        orderBy: options?.orderBy || { createdAt: 'desc' },
      });

      return result;
    } catch (error) {
      logger.error(`Failed to find multiple ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    where: Partial<T>, 
    pagination: PaginationParams, 
    options?: QueryOptions
  ): Promise<PaginationResult<T>> {
    try {
      const whereClause = this.buildWhereClause(where);
      const { skip, take, page, limit } = this.applyPagination(pagination);
      const orderBy = this.applySorting(pagination);

      const [data, total] = await Promise.all([
        this.model.findMany({
          where: whereClause,
          include: options?.include ? this.buildInclude(options.include) : undefined,
          select: options?.select ? this.buildSelect(options.select) : undefined,
          orderBy,
          skip,
          take,
        }),
        this.model.count({ where: whereClause }),
      ]);

      return this.buildPaginationResult(data, total, pagination);
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} with pagination`, error as Error);
      throw error;
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: Partial<T>, options?: QueryOptions): Promise<T> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      const result = await this.model.update({
        where: { id },
        data: updateData,
        include: options?.include ? this.buildInclude(options.include) : undefined,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Updated ${this.modelName}`, { id });
      return result;
    } catch (error) {
      logger.error(`Failed to update ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Update multiple entities
   */
  async updateMany(where: Partial<T>, data: Partial<T>, options?: QueryOptions): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(where);
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      const result = await this.model.updateMany({
        where: whereClause,
        data: updateData,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Updated ${result.count} ${this.modelName} records`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to update multiple ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Hard delete entity by ID
   */
  async delete(id: string, options?: QueryOptions): Promise<void> {
    try {
      await this.model.delete({
        where: { id },
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Deleted ${this.modelName}`, { id });
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Hard delete multiple entities
   */
  async deleteMany(where: Partial<T>, options?: QueryOptions): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(where, true); // Include soft deleted
      
      const result = await this.model.deleteMany({
        where: whereClause,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Deleted ${result.count} ${this.modelName} records`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to delete multiple ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Soft delete entity by ID
   */
  async softDelete(id: string, options?: QueryOptions): Promise<T> {
    try {
      const result = await this.model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
        include: options?.include ? this.buildInclude(options.include) : undefined,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Soft deleted ${this.modelName}`, { id });
      return result;
    } catch (error) {
      logger.error(`Failed to soft delete ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Count entities matching criteria
   */
  async count(where?: Partial<T>): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(where);
      
      const result = await this.model.count({
        where: whereClause,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to count ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Restore soft-deleted entity
   */
  async restore(id: string, options?: QueryOptions): Promise<T> {
    try {
      const result = await this.model.update({
        where: { id },
        data: {
          deletedAt: null,
          updatedAt: new Date(),
        },
        include: options?.include ? this.buildInclude(options.include) : undefined,
        ...(options?.transaction && { transaction: options.transaction }),
      });

      logger.debug(`Restored ${this.modelName}`, { id });
      return result;
    } catch (error) {
      logger.error(`Failed to restore ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Bulk update entities
   */
  async bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>, options?: QueryOptions): Promise<T[]> {
    try {
      const results: T[] = [];
      
      for (const update of updates) {
        const result = await this.update(update.id, update.data, options);
        results.push(result);
      }

      logger.debug(`Bulk updated ${results.length} ${this.modelName} records`);
      return results;
    } catch (error) {
      logger.error(`Failed to bulk update ${this.modelName}`, error as Error);
      throw error;
    }
  }

  /**
   * Execute within transaction
   */
  async withTransaction<R>(callback: (transaction: any) => Promise<R>): Promise<R> {
    return this.dbClient.$transaction(callback);
  }

  /**
   * Build include clause for Prisma
   */
  protected buildInclude(include: string[]): Record<string, boolean> {
    const includeClause: Record<string, boolean> = {};
    
    for (const field of include) {
      includeClause[field] = true;
    }

    return includeClause;
  }

  /**
   * Build select clause for Prisma
   */
  protected buildSelect(select: string[]): Record<string, boolean> {
    const selectClause: Record<string, boolean> = {};
    
    for (const field of select) {
      selectClause[field] = true;
    }

    return selectClause;
  }

  /**
   * Build complex where clauses
   */
  protected buildComplexWhere(filters: Record<string, any>): Record<string, any> {
    const where: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Handle special filter operations
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Handle operators like { gte: 100 }, { contains: 'search' }, etc.
        where[key] = value;
      } else if (Array.isArray(value)) {
        // Handle IN operations
        where[key] = { in: value };
      } else {
        // Direct value match
        where[key] = value;
      }
    }

    return where;
  }
}
