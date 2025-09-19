import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Users, DollarSign, MapPin, Eye, Edit, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { departmentAPI } from '@/lib/api'
import { debounce } from '@/lib/utils'

interface Department {
  id: string
  name: string
  description?: string
  code: string
  managerId?: string
  manager?: {
    firstName: string
    lastName: string
  }
  budget?: number
  location?: string
  isActive: boolean
  employeeCount?: number
  createdAt: string
  updatedAt: string
}

const DepartmentList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const {
    data: departmentsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['departments', { search: searchTerm, status: statusFilter }],
    queryFn: () => departmentAPI.getDepartments()
  })

  const departments: Department[] = departmentsData?.data || []

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term)
    }, 300),
    []
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    )
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading departments</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-600">Manage organizational departments and their settings</p>
        </div>
        <Link to="/departments/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search departments..."
                className="pl-10"
                onChange={handleSearchChange}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Departments</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : departments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No departments found</p>
            <Link to="/departments/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Department
              </Button>
            </Link>
          </div>
        ) : (
          departments.map((department) => (
            <Card key={department.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                    <p className="text-sm text-gray-500">{department.code}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(department.isActive)}
                    <div className="relative">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {department.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {department.description}
                  </p>
                )}

                <div className="space-y-2">
                  {department.manager && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Manager:</span>
                      <span className="font-medium">
                        {department.manager.firstName} {department.manager.lastName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Employees:</span>
                    <span className="font-medium">{department.employeeCount || 0}</span>
                  </div>

                  {department.budget && (
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-medium">{formatCurrency(department.budget)}</span>
                    </div>
                  )}

                  {department.location && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{department.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Link to={`/departments/${department.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/departments/${department.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                  <Link 
                    to={`/employees?departmentId=${department.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Employees →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {departments.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{departments.length}</div>
                <div className="text-sm text-gray-600">Total Departments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {departments.filter(d => d.isActive).length}
                </div>
                <div className="text-sm text-gray-600">Active Departments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Employees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(departments.reduce((sum, d) => sum + (d.budget || 0), 0))}
                </div>
                <div className="text-sm text-gray-600">Total Budget</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DepartmentList
