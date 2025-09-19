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
import { departmentAPI, employeeAPI } from '@/lib/api'

const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Department code is required').min(2, 'Code must be at least 2 characters'),
  description: z.string().optional(),
  managerId: z.string().optional(),
  budget: z.number().min(0, 'Budget must be a positive number').optional(),
  location: z.string().optional(),
  isActive: z.boolean().default(true),
})

type DepartmentFormData = z.infer<typeof departmentSchema>

const DepartmentForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      isActive: true
    }
  })

  // Fetch department data for editing
  const { data: department, isLoading: loadingDepartment } = useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentAPI.getDepartment(id!),
    enabled: isEdit,
  })

  // Fetch employees for manager selection
  const { data: employeesData } = useQuery({
    queryKey: ['employees', 'managers'],
    queryFn: () => employeeAPI.getEmployees({ 
      status: 'ACTIVE',
      limit: 100, // Get more employees for manager selection
    }),
  })

  const employees = employeesData?.data?.employees || []

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => departmentAPI.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      navigate('/departments')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => departmentAPI.updateDepartment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['department', id] })
      navigate('/departments')
    },
  })

  // Populate form with existing data for editing
  useEffect(() => {
    if (department?.data && isEdit) {
      const dept = department.data
      reset({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        managerId: dept.managerId || '',
        budget: dept.budget || undefined,
        location: dept.location || '',
        isActive: dept.isActive,
      })
    }
  }, [department, isEdit, reset])

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Transform form data to match API expectations
      const departmentData = {
        ...data,
        budget: data.budget ? Number(data.budget) : undefined,
        managerId: data.managerId || undefined,
      }

      if (isEdit) {
        await updateMutation.mutateAsync(departmentData)
      } else {
        await createMutation.mutateAsync(departmentData)
      }
    } catch (error) {
      console.error('Error saving department:', error)
    }
  }

  if (loadingDepartment && isEdit) {
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
        <Button variant="ghost" onClick={() => navigate('/departments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Departments
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Department' : 'Add New Department'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update department information' : 'Create a new department'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential department details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <Input
                  {...register('name')}
                  placeholder="e.g., Human Resources"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Code *
                </label>
                <Input
                  {...register('code')}
                  placeholder="e.g., HR"
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                {...register('description')}
                rows={4}
                placeholder="Brief description of the department's role and responsibilities..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Management & Budget */}
        <Card>
          <CardHeader>
            <CardTitle>Management & Budget</CardTitle>
            <CardDescription>Department manager and financial information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Manager
                </label>
                <Select {...register('managerId')}>
                  <option value="">Select Manager</option>
                  {employees.map((employee: any) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.position.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Budget (USD)
                </label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  {...register('budget', { valueAsNumber: true })}
                  placeholder="e.g., 500000"
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-500">{errors.budget.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Location
              </label>
              <Input
                {...register('location')}
                placeholder="e.g., New York Office, Floor 3"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Department Status</CardTitle>
            <CardDescription>Set the active status of this department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('isActive')}
                id="isActive"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Department is active
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Inactive departments won't appear in employee assignment options
            </p>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/departments')}
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
                {isEdit ? 'Update Department' : 'Create Department'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default DepartmentForm
