// Employee Service Types - now using centralized shared types
import { 
  Employee as PrismaEmployee,
  Department as PrismaDepartment,
  Position as PrismaPosition,
  EmployeeHistory as PrismaEmployeeHistory
} from '@prisma/client';

// Import centralized types from shared service
export {
  // Employee domain types
  Employee,
  Department, 
  Position,
  EmployeeInfo,
  DepartmentInfo,
  PositionInfo,
  
  // Enums
  Gender,
  MaritalStatus,
  EmploymentType,
  WorkLocation,
  EmployeeStatus,
  PayrollSchedule,
  ChangeType,
  
  // Request/Response types
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeResponse,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentResponse,
  PositionCreateRequest,
  PositionUpdateRequest,
  PositionResponse,
  
  // Supporting interfaces
  CertificationInfo,
  EducationInfo,
  ExperienceInfo,
  EmployeeHistory,
  
  // Search and filter types
  EmployeeSearchParams,
  DepartmentSearchParams,
  PositionSearchParams,
  
  // Analytics types
  EmployeeAnalytics,
  DepartmentStats,
  PositionStats,
  DemographicStats,
  
  // Common types
  AddressInfo,
  ContactInfo,
  APIResponse,
  APIError,
  PaginationParams,
  ValidationError
} from '@hrms/shared';

// Service-specific types that are not in shared
// (Add any employee-service specific interfaces here if needed)
