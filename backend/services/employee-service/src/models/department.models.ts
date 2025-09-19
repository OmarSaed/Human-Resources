// Employee-related interfaces for department operations
export interface EmployeeWithSalary {
  id: string;
  status: string;
  baseSalary: any;
  hireDate: Date;
  terminationDate: Date | null;
}

export interface PositionWithEmployees {
  id: string;
  employees: { id: string }[];
}

export interface DepartmentWithStats {
  id: string;
  name: string;
  code: string;
  budget: any;
  employees: EmployeeWithSalary[];
  positions: PositionWithEmployees[];
}
