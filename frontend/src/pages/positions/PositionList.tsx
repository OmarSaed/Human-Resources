import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Users, DollarSign, Building, Eye, Edit, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { positionAPI, departmentAPI } from '@/lib/api'
import { debounce, formatCurrency } from '@/lib/utils'

interface Position {
  id: string
  title: string
  description?: string
  departmentId: string
  department: {
    id: string
    name: string
    code: string
  }
  level: number
  salaryMin?: number
  salaryMax?: number
  requirements?: string[]
  responsibilities?: string[]
  employeeCount?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const PositionList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [levelFilter, setLevelFilter] = useState('')

  const {
    data: positionsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['positions', { search: searchTerm, department: departmentFilter, status: statusFilter, level: levelFilter }],
    queryFn: () => positionAPI.getPositions({
      search: searchTerm,
      departmentId: departmentFilter || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      level: levelFilter || undefined
    })
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments({ isActive: true }),
  })

  const positions: Position[] = positionsData?.data || []
  const departments = departmentsData?.data || []

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

  const getLevelBadge = (level: number) => {
    const levelConfig = {
      1: { label: 'Entry', color: 'bg-green-100 text-green-800' },
      2: { label: 'Junior', color: 'bg-blue-100 text-blue-800' },
      3: { label: 'Mid', color: 'bg-yellow-100 text-yellow-800' },
      4: { label: 'Senior', color: 'bg-orange-100 text-orange-800' },
      5: { label: 'Lead', color: 'bg-purple-100 text-purple-800' },
      6: { label: 'Principal', color: 'bg-red-100 text-red-800' },
    }
    
    const config = levelConfig[level as keyof typeof levelConfig] || { label: `Level ${level}`, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const formatSalaryRange = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified'
    if (!max) return `From ${formatCurrency(min || 0)}`
    if (!min) return `Up to ${formatCurrency(max)}`
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading positions</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Positions</h1>
          <p className="text-gray-600">Manage job positions and career levels</p>
        </div>
        <Link to="/positions/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Position
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
                placeholder="Search positions..."
                className="pl-10"
                onChange={handleSearchChange}
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Levels</option>
                <option value="1">Entry (1)</option>
                <option value="2">Junior (2)</option>
                <option value="3">Mid (3)</option>
                <option value="4">Senior (4)</option>
                <option value="5">Lead (5)</option>
                <option value="6">Principal (6)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        ) : positions.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No positions found</p>
            <Link to="/positions/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Position
              </Button>
            </Link>
          </div>
        ) : (
          positions.map((position) => (
            <Card key={position.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{position.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{position.department.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(position.isActive)}
                    <div className="relative">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {position.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {position.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Level:</span>
                    {getLevelBadge(position.level)}
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Employees:</span>
                    <span className="font-medium">{position.employeeCount || 0}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Salary:</span>
                    <span className="font-medium text-xs">
                      {formatSalaryRange(position.salaryMin, position.salaryMax)}
                    </span>
                  </div>

                  {position.requirements && position.requirements.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-600">Requirements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {position.requirements.slice(0, 3).map((req, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {req}
                          </Badge>
                        ))}
                        {position.requirements.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{position.requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Link to={`/positions/${position.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/positions/${position.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                  <Link 
                    to={`/employees?positionId=${position.id}`}
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
      {positions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{positions.length}</div>
                <div className="text-sm text-gray-600">Total Positions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {positions.filter(p => p.isActive).length}
                </div>
                <div className="text-sm text-gray-600">Active Positions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {positions.reduce((sum, p) => sum + (p.employeeCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Employees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {new Set(positions.map(p => p.departmentId)).size}
                </div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PositionList
