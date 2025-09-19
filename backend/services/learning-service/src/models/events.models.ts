/**
 * Event-related interfaces and models for learning service
 */

export interface LearningEvent {
  id: string;
  type: string;
  timestamp: Date;
  version: string;
  source: string;
  data: any;
  correlationId?: string;
}

export interface EmployeeEvent {
  type: 'employee.created' | 'employee.updated' | 'employee.deleted' | 'employee.role-changed';
  employeeId: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}
