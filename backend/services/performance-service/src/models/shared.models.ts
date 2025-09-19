/**
 * Shared interfaces and models used across performance service
 */

// Pagination interfaces (to replace duplicates across files)
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Employee info interfaces
export interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  manager?: string;
  status?: string;
  hireDate?: string;
}

export interface EmployeeRequestEvent {
  id: string;
  type: 'EMPLOYEE_FETCH_REQUEST';
  source: 'performance-service';
  version: '1.0';
  data: {
    employeeIds: string[];
    requestId: string;
    requestedBy: string;
    requestedAt: string;
  };
  correlationId: string;
  timestamp: string;
}

export interface EmployeeResponseEvent {
  id: string;
  type: 'EMPLOYEE_FETCH_RESPONSE';
  source: 'employee-service';
  version: '1.0';
  data: {
    employees: EmployeeInfo[];
    requestId: string;
    foundCount: number;
  };
  correlationId: string;
  timestamp: string;
}
