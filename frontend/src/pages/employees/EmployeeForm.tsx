import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { employeeAPI, departmentAPI, positionAPI } from '@/lib/api'
import { EmploymentType, WorkLocation, EmployeeStatus, PayrollSchedule, Gender, MaritalStatus } from '@/types/employee'

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  nationality: z.string().optional(),
  
  // Employment Details
  departmentId: z.string().min(1, 'Department is required'),
  positionId: z.string().min(1, 'Position is required'),
  managerId: z.string().optional(),
  hireDate: z.string().min(1, 'Hire date is required'),
  employmentType: z.nativeEnum(EmploymentType),
  workLocation: z.nativeEnum(WorkLocation),
  status: z.nativeEnum(EmployeeStatus),
  
  // Salary & Benefits
  baseSalary: z.number().optional(),
  currency: z.string().default('USD'),
  payrollSchedule: z.nativeEnum(PayrollSchedule),
  
  // Address
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZipCode: z.string().optional(),
  addressCountry: z.string().optional(),
  
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactEmail: z.string().optional(),
  
  // Additional
  notes: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const EmployeeForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employmentType: EmploymentType.FULL_TIME,
      workLocation: WorkLocation.OFFICE,
      status: EmployeeStatus.ACTIVE,
      payrollSchedule: PayrollSchedule.MONTHLY,
      currency: 'USD'
    }
  })

  // Fetch employee data for editing
  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeAPI.getEmployee(id!),
    enabled: isEdit,
  })

  // Fetch departments and positions
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments(),
  })

  const selectedDepartmentId = watch('departmentId')
  const { data: positionsData } = useQuery({
    queryKey: ['positions', selectedDepartmentId],
    queryFn: () => positionAPI.getPositions({ departmentId: selectedDepartmentId }),
    enabled: Boolean(selectedDepartmentId),
  })

  const departments = departmentsData?.data || []
  const positions = positionsData?.data || []

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => employeeAPI.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/employees')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeeAPI.updateEmployee(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      navigate('/employees')
    },
  })

  // Populate form with existing data for editing
  useEffect(() => {
    if (employee?.data && isEdit) {
      const emp = employee.data
      reset({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || '',
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
        gender: emp.gender,
        maritalStatus: emp.maritalStatus,
        nationality: emp.nationality || '',
        departmentId: emp.departmentId,
        positionId: emp.positionId,
        managerId: emp.managerId || '',
        hireDate: emp.hireDate.split('T')[0],
        employmentType: emp.employmentType,
        workLocation: emp.workLocation,
        status: emp.status,
        baseSalary: emp.baseSalary || undefined,
        currency: emp.currency,
        payrollSchedule: emp.payrollSchedule,
        notes: emp.notes || '',
        // Address
        addressStreet: emp.address?.street || '',
        addressCity: emp.address?.city || '',
        addressState: emp.address?.state || '',
        addressZipCode: emp.address?.zipCode || '',
        addressCountry: emp.address?.country || '',
        // Emergency Contact
        emergencyContactName: emp.emergencyContact?.name || '',
        emergencyContactRelationship: emp.emergencyContact?.relationship || '',
        emergencyContactPhone: emp.emergencyContact?.phone || '',
        emergencyContactEmail: emp.emergencyContact?.email || '',
      })
    }
  }, [employee, isEdit, reset])

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Transform form data to match API expectations
      const employeeData = {
        ...data,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
        address: data.addressStreet ? {
          street: data.addressStreet,
          city: data.addressCity,
          state: data.addressState,
          zipCode: data.addressZipCode,
          country: data.addressCountry,
        } : undefined,
        emergencyContact: data.emergencyContactName ? {
          name: data.emergencyContactName,
          relationship: data.emergencyContactRelationship,
          phone: data.emergencyContactPhone,
          email: data.emergencyContactEmail,
        } : undefined,
      }

      // Remove address fields from root level
      const {
        addressStreet, addressCity, addressState, addressZipCode, addressCountry,
        emergencyContactName, emergencyContactRelationship, emergencyContactPhone, emergencyContactEmail,
        ...cleanData
      } = employeeData

      if (isEdit) {
        await updateMutation.mutateAsync(cleanData)
      } else {
        await createMutation.mutateAsync(cleanData)
      }
    } catch (error) {
      console.error('Error saving employee:', error)
    }
  }

  if (loadingEmployee && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Employee' : 'Add New Employee'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update employee information' : 'Create a new employee profile'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic personal details of the employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  {...register('firstName')}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  {...register('lastName')}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input {...register('phone')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <Input type="date" {...register('dateOfBirth')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <Select {...register('gender')}>
                  <option value="">Select Gender</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                  <option value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status
                </label>
                <Select {...register('maritalStatus')}>
                  <option value="">Select Status</option>
                  <option value={MaritalStatus.SINGLE}>Single</option>
                  <option value={MaritalStatus.MARRIED}>Married</option>
                  <option value={MaritalStatus.DIVORCED}>Divorced</option>
                  <option value={MaritalStatus.WIDOWED}>Widowed</option>
                  <option value={MaritalStatus.OTHER}>Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <Input {...register('nationality')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Job-related information and employment terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <Select
                  {...register('departmentId')}
                  className={errors.departmentId ? 'border-red-500' : ''}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
                {errors.departmentId && (
                  <p className="mt-1 text-sm text-red-500">{errors.departmentId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <Select
                  {...register('positionId')}
                  className={errors.positionId ? 'border-red-500' : ''}
                  disabled={!selectedDepartmentId}
                >
                  <option value="">Select Position</option>
                  {positions.map((pos: any) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title}
                    </option>
                  ))}
                </Select>
                {errors.positionId && (
                  <p className="mt-1 text-sm text-red-500">{errors.positionId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date *
                </label>
                <Input
                  type="date"
                  {...register('hireDate')}
                  className={errors.hireDate ? 'border-red-500' : ''}
                />
                {errors.hireDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.hireDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <Select {...register('employmentType')}>
                  <option value={EmploymentType.FULL_TIME}>Full Time</option>
                  <option value={EmploymentType.PART_TIME}>Part Time</option>
                  <option value={EmploymentType.CONTRACT}>Contract</option>
                  <option value={EmploymentType.INTERN}>Intern</option>
                  <option value={EmploymentType.TEMPORARY}>Temporary</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Location
                </label>
                <Select {...register('workLocation')}>
                  <option value={WorkLocation.OFFICE}>Office</option>
                  <option value={WorkLocation.REMOTE}>Remote</option>
                  <option value={WorkLocation.HYBRID}>Hybrid</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select {...register('status')}>
                  <option value={EmployeeStatus.ACTIVE}>Active</option>
                  <option value={EmployeeStatus.INACTIVE}>Inactive</option>
                  <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
                  <option value={EmployeeStatus.TERMINATED}>Terminated</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Salary and payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Salary
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('baseSalary', { valueAsNumber: true })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <Select {...register('currency')}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payroll Schedule
                </label>
                <Select {...register('payrollSchedule')}>
                  <option value={PayrollSchedule.WEEKLY}>Weekly</option>
                  <option value={PayrollSchedule.BI_WEEKLY}>Bi-weekly</option>
                  <option value={PayrollSchedule.MONTHLY}>Monthly</option>
                  <option value={PayrollSchedule.QUARTERLY}>Quarterly</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Home address information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input {...register('addressStreet')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input {...register('addressCity')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <Input {...register('addressState')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP/Postal Code
                  </label>
                  <Input {...register('addressZipCode')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input {...register('addressCountry')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Emergency contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <Input {...register('emergencyContactName')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <Input {...register('emergencyContactRelationship')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input {...register('emergencyContactPhone')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input type="email" {...register('emergencyContactEmail')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Any additional notes or comments</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                {...register('notes')}
                rows={4}
                placeholder="Enter any additional notes about the employee..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/employees')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
          >
            {(isSubmitting || createMutation.isPending || updateMutation.isPending) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update Employee' : 'Create Employee'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeForm
