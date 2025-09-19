import { Prisma } from '@prisma/client';

/**
 * Utility functions to handle type conversions between undefined and null
 */

export function convertUndefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export function convertNumberToDecimal(value: number | undefined): Prisma.Decimal | null {
  return value === undefined ? null : new Prisma.Decimal(value);
}

export function convertDecimalToNumber(value: Prisma.Decimal | null): number | undefined {
  return value === null ? undefined : Number(value);
}

export function ensurePaginationParams(params: { page?: number; limit?: number }) {
  return {
    page: params.page || 1,
    limit: params.limit || 20
  };
}

export function createAuditData(
  entityType: string,
  entityId: string,
  action: string,
  userId: string,
  changes?: Record<string, any>,
  metadata?: Record<string, any>
) {
  return {
    entityType,
    entityId,
    action,
    userId,
    changes,
    metadata
  };
}
