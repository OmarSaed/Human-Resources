export interface Employee {
  id: string
  employeeNumber: string
  userId?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: string
  gender?: Gender
  maritalStatus?: MaritalStatus
  nationality?: string
  address?: Address
  emergencyContact?: EmergencyContact
  
  // Employment Details
  departmentId: string
  positionId: string
  managerId?: string
  hireDate: string
  terminationDate?: string
  employmentType: EmploymentType
  workLocation: WorkLocation
  status: EmployeeStatus
  
  // Salary & Benefits
  baseSalary?: number
  currency: string
  payrollSchedule: PayrollSchedule
  benefits?: any
  
  // Professional Details
  skills?: string[]
  certifications?: any[]
  education?: any[]
  experience?: any[]
  
  // System Fields
  profilePicture?: string
  documents?: any[]
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string

  // Relations
  department: Department
  position: Position
  manager?: Employee
}

export interface Department {
  id: string
  name: string
  description?: string
  code: string
  managerId?: string
  budget?: number
  location?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Position {
  id: string
  title: string
  description?: string
  departmentId: string
  level: number
  salaryMin?: number
  salaryMax?: number
  requirements?: any
  responsibilities?: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

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
