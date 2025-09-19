// Employee domain types - shared across services

import { BaseEntity, PaginationParams, DateRangeFilter, NumberRangeFilter, EmployeeInfo, DepartmentInfo, PositionInfo, AddressInfo, ContactInfo, Status, Priority } from './common';

// Core Employee Types
export interface Employee extends BaseEntity {
  employeeNumber: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: AddressInfo;
  emergencyContact?: ContactInfo;
  departmentId: string;
  positionId: string;
  managerId?: string;
  hireDate: Date;
  terminationDate?: Date;
  employmentType: EmploymentType;
  workLocation: WorkLocation;
  status: EmployeeStatus;
  baseSalary?: number;
  currency: string;
  payrollSchedule: PayrollSchedule;
  benefits?: Record<string, any>;
  skills?: string[];
  certifications?: CertificationInfo[];
  education?: EducationInfo[];
  experience?: ExperienceInfo[];
  profilePicture?: string;
  documents?: string[];
  notes?: string;
  isActive: boolean;
}

export interface Department extends BaseEntity {
  name: string;
  description?: string;
  code: string;
  managerId?: string;
  budget?: number;
  location?: string;
  isActive: boolean;
}

export interface Position extends BaseEntity {
  title: string;
  description?: string;
  departmentId: string;
  level: number;
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string[];
  responsibilities?: string[];
  isActive: boolean;
}

// Enums
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  OTHER = 'OTHER'
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  TEMPORARY = 'TEMPORARY'
}

export enum WorkLocation {
  OFFICE = 'OFFICE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID'
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED'
}

export enum PayrollSchedule {
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY'
}

export enum ChangeType {
  PROMOTION = 'PROMOTION',
  TRANSFER = 'TRANSFER',
  SALARY_CHANGE = 'SALARY_CHANGE',
  DEPARTMENT_CHANGE = 'DEPARTMENT_CHANGE',
  POSITION_CHANGE = 'POSITION_CHANGE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  PERSONAL_INFO_CHANGE = 'PERSONAL_INFO_CHANGE'
}

// Request/Response Types
export interface EmployeeCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: AddressInfo;
  emergencyContact?: ContactInfo;
  departmentId: string;
  positionId: string;
  managerId?: string;
  hireDate: string;
  employmentType: EmploymentType;
  workLocation: WorkLocation;
  baseSalary?: number;
  currency?: string;
  payrollSchedule?: PayrollSchedule;
  skills?: string[];
  certifications?: CertificationInfo[];
  education?: EducationInfo[];
  experience?: ExperienceInfo[];
}

export interface EmployeeUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: AddressInfo;
  emergencyContact?: ContactInfo;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  employmentType?: EmploymentType;
  workLocation?: WorkLocation;
  status?: EmployeeStatus;
  baseSalary?: number;
  currency?: string;
  payrollSchedule?: PayrollSchedule;
  skills?: string[];
  certifications?: CertificationInfo[];
  education?: EducationInfo[];
  experience?: ExperienceInfo[];
  notes?: string;
}

export interface EmployeeResponse extends Employee {
  department?: Department;
  position?: Position;
  manager?: EmployeeInfo;
  directReports?: EmployeeInfo[];
  fullName: string;
  age?: number;
  tenure?: string;
}

export interface DepartmentCreateRequest {
  name: string;
  description?: string;
  code: string;
  managerId?: string;
  budget?: number;
  location?: string;
}

export interface DepartmentUpdateRequest {
  name?: string;
  description?: string;
  code?: string;
  managerId?: string;
  budget?: number;
  location?: string;
  isActive?: boolean;
}

export interface DepartmentResponse extends Department {
  manager?: EmployeeInfo;
  employees?: EmployeeInfo[];
  employeeCount: number;
  positions?: Position[];
}

export interface PositionCreateRequest {
  title: string;
  description?: string;
  departmentId: string;
  level?: number;
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string[];
  responsibilities?: string[];
}

export interface PositionUpdateRequest {
  title?: string;
  description?: string;
  departmentId?: string;
  level?: number;
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string[];
  responsibilities?: string[];
  isActive?: boolean;
}

export interface PositionResponse extends Position {
  department?: Department;
  employees?: EmployeeInfo[];
  employeeCount: number;
}

// Supporting Interfaces
export interface CertificationInfo {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface EducationInfo {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  description?: string;
}

export interface ExperienceInfo {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  skills?: string[];
}

export interface EmployeeHistory extends BaseEntity {
  employeeId: string;
  changeType: ChangeType;
  field: string;
  oldValue?: string;
  newValue?: string;
  effectiveDate: Date;
  reason?: string;
  changedBy: string;
  notes?: string;
}

// Search and Filter Types
export interface EmployeeSearchParams extends PaginationParams {
  query?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  workLocation?: WorkLocation;
  hireDate?: DateRangeFilter;
  skills?: string[];
}

export interface DepartmentSearchParams extends PaginationParams {
  query?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface PositionSearchParams extends PaginationParams {
  query?: string;
  departmentId?: string;
  level?: number;
  salaryRange?: NumberRangeFilter;
  isActive?: boolean;
}

// Analytics Types
export interface EmployeeAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  averageTenure: number;
  departmentBreakdown: DepartmentStats[];
  positionBreakdown: PositionStats[];
  demographicBreakdown: DemographicStats;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  avgSalary: number;
  turnoverRate: number;
  totalBudget?: number;
  budgetUtilization?: number;
  openPositions?: number;
  satisfactionScore?: number;
}

export interface PositionStats {
  positionId: string;
  positionTitle: string;
  employeeCount: number;
  avgSalary: number;
  vacancies: number;
  level: number;
  departmentId: string;
  salaryRange: {
    min: number;
    max: number;
  };
  employeeSatisfaction: number;
}

export interface DemographicStats {
  genderBreakdown: Record<string, number>;
  ageGroups: Record<string, number>;
  workLocationBreakdown: Record<string, number>;
  employmentTypeBreakdown: Record<string, number>;
}
