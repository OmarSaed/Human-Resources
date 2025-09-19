import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Mail, Phone, MapPin, Building, User } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { employeeAPI } from '@/lib/api'
import { Employee, EmployeeStatus } from '@/types/employee'
import { debounce } from '@/lib/utils'

const EmployeeDirectory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'ALL'>('ALL')

  const {
    data: employeesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['employees-directory', { search: searchTerm, department: departmentFilter, status: statusFilter }],
    queryFn: () => employeeAPI.getEmployees({
      query: searchTerm,
      departmentId: departmentFilter || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 100 // Get more for directory view
    })
  })

  const employees: Employee[] = employeesData?.data?.employees || []

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term)
    }, 300),
    []
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }

  // Get unique departments for filter
  const departments = useMemo(() => {
    const deptSet = new Set(employees.map(emp => emp.department.id))
    return employees
      .filter(emp => deptSet.has(emp.department.id))
      .reduce((acc: any[], emp) => {
        if (!acc.find(d => d.id === emp.department.id)) {
          acc.push(emp.department)
        }
        return acc
      }, [])
  }, [employees])

  const getStatusColor = (status: EmployeeStatus) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-800 border-gray-200',
      TERMINATED: 'bg-red-100 text-red-800 border-red-200',
      ON_LEAVE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return colors[status]
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading employee directory</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employee Directory</h1>
        <p className="text-gray-600">Browse and connect with your colleagues</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or position..."
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

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | 'ALL')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 text-center w-full">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No employees found</p>
          <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-lg">
                          {getInitials(employee.firstName, employee.lastName)}
                        </span>
                      )}
                    </div>
                    {/* Status Indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      employee.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>

                  {/* Employee Info */}
                  <div className="text-center space-y-2 w-full">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{employee.position.title}</p>
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      className={`text-xs ${getStatusColor(employee.status)}`}
                      variant="outline"
                    >
                      {employee.status.replace('_', ' ')}
                    </Badge>

                    {/* Department */}
                    <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                      <Building className="w-3 h-3" />
                      <span>{employee.department.name}</span>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                          <Phone className="w-3 h-3" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      {employee.address && (
                        <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{employee.address.city}, {employee.address.country}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Link to={`/employees/${employee.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Profile
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      {employee.phone && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(`tel:${employee.phone}`, '_blank')}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {employees.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
          {searchTerm && ` matching "${searchTerm}"`}
          {departmentFilter && departments.find((d: any) => d.id === departmentFilter) && 
            ` in ${departments.find((d: any) => d.id === departmentFilter)?.name}`
          }
        </div>
      )}
    </div>
  )
}

export default EmployeeDirectory
