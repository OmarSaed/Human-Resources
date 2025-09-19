import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { positionAPI, departmentAPI } from '@/lib/api'

const positionSchema = z.object({
  title: z.string().min(1, 'Position title is required').min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  level: z.number().min(1, 'Level must be at least 1').max(10, 'Level cannot exceed 10'),
  salaryMin: z.number().min(0, 'Minimum salary must be positive').optional(),
  salaryMax: z.number().min(0, 'Maximum salary must be positive').optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    return false
  }
  return true
}, {
  message: "Maximum salary must be greater than minimum salary",
  path: ["salaryMax"],
})

type PositionFormData = z.infer<typeof positionSchema>

const PositionForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const queryClient = useQueryClient()
  const [requirementInput, setRequirementInput] = useState('')
  const [responsibilityInput, setResponsibilityInput] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      isActive: true,
      level: 1,
      requirements: [],
      responsibilities: []
    }
  })

  const requirements = watch('requirements') || []
  const responsibilities = watch('responsibilities') || []

  // Fetch position data for editing
  const { data: position, isLoading: loadingPosition } = useQuery({
    queryKey: ['position', id],
    queryFn: () => positionAPI.getPosition(id!),
    enabled: isEdit,
  })

  // Fetch departments for selection
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments({ isActive: true }),
  })

  const departments = departmentsData?.data || []

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => positionAPI.createPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      navigate('/positions')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => positionAPI.updatePosition(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      queryClient.invalidateQueries({ queryKey: ['position', id] })
      navigate('/positions')
    },
  })

  // Populate form with existing data for editing
  useEffect(() => {
    if (position?.data && isEdit) {
      const pos = position.data
      reset({
        title: pos.title,
        description: pos.description || '',
        departmentId: pos.departmentId,
        level: pos.level,
        salaryMin: pos.salaryMin || undefined,
        salaryMax: pos.salaryMax || undefined,
        requirements: pos.requirements || [],
        responsibilities: pos.responsibilities || [],
        isActive: pos.isActive,
      })
    }
  }, [position, isEdit, reset])

  const addRequirement = () => {
    if (requirementInput.trim() && !requirements.includes(requirementInput.trim())) {
      setValue('requirements', [...requirements, requirementInput.trim()])
      setRequirementInput('')
    }
  }

  const removeRequirement = (index: number) => {
    const newRequirements = requirements.filter((_, i) => i !== index)
    setValue('requirements', newRequirements)
  }

  const addResponsibility = () => {
    if (responsibilityInput.trim() && !responsibilities.includes(responsibilityInput.trim())) {
      setValue('responsibilities', [...responsibilities, responsibilityInput.trim()])
      setResponsibilityInput('')
    }
  }

  const removeResponsibility = (index: number) => {
    const newResponsibilities = responsibilities.filter((_, i) => i !== index)
    setValue('responsibilities', newResponsibilities)
  }

  const onSubmit = async (data: PositionFormData) => {
    try {
      const positionData = {
        ...data,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
      }

      if (isEdit) {
        await updateMutation.mutateAsync(positionData)
      } else {
        await createMutation.mutateAsync(positionData)
      }
    } catch (error) {
      console.error('Error saving position:', error)
    }
  }

  if (loadingPosition && isEdit) {
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
        <Button variant="ghost" onClick={() => navigate('/positions')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Positions
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Position' : 'Add New Position'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update position information' : 'Create a new job position'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential position details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Title *
                </label>
                <Input
                  {...register('title')}
                  placeholder="e.g., Senior Software Engineer"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

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
                  Level *
                </label>
                <Select
                  {...register('level', { valueAsNumber: true })}
                  className={errors.level ? 'border-red-500' : ''}
                >
                  <option value={1}>Entry Level (1)</option>
                  <option value={2}>Junior (2)</option>
                  <option value={3}>Mid Level (3)</option>
                  <option value={4}>Senior (4)</option>
                  <option value={5}>Lead (5)</option>
                  <option value={6}>Principal (6)</option>
                  <option value={7}>Director (7)</option>
                  <option value={8}>VP (8)</option>
                  <option value={9}>C-Level (9)</option>
                  <option value={10}>Executive (10)</option>
                </Select>
                {errors.level && (
                  <p className="mt-1 text-sm text-red-500">{errors.level.message}</p>
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
                placeholder="Brief description of the position..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation Range</CardTitle>
            <CardDescription>Salary range for this position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Salary (USD)
                </label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  {...register('salaryMin', { valueAsNumber: true })}
                  placeholder="e.g., 75000"
                  className={errors.salaryMin ? 'border-red-500' : ''}
                />
                {errors.salaryMin && (
                  <p className="mt-1 text-sm text-red-500">{errors.salaryMin.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Salary (USD)
                </label>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  {...register('salaryMax', { valueAsNumber: true })}
                  placeholder="e.g., 120000"
                  className={errors.salaryMax ? 'border-red-500' : ''}
                />
                {errors.salaryMax && (
                  <p className="mt-1 text-sm text-red-500">{errors.salaryMax.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>Skills, qualifications, and experience required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Add requirement (e.g., Bachelor's degree, 3+ years experience)"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                className="flex-1"
              />
              <Button type="button" onClick={addRequirement} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {requirements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {requirements.map((requirement, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{requirement}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle>Responsibilities</CardTitle>
            <CardDescription>Key duties and responsibilities of this position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Add responsibility (e.g., Lead development team, Design systems)"
                value={responsibilityInput}
                onChange={(e) => setResponsibilityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                className="flex-1"
              />
              <Button type="button" onClick={addResponsibility} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {responsibilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {responsibilities.map((responsibility, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{responsibility}</span>
                    <button
                      type="button"
                      onClick={() => removeResponsibility(index)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Position Status</CardTitle>
            <CardDescription>Set the active status of this position</CardDescription>
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
                Position is active
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Inactive positions won't appear in employee assignment options
            </p>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/positions')}
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
                {isEdit ? 'Update Position' : 'Create Position'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PositionForm
