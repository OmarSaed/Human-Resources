import React from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Users, DollarSign, MapPin, Calendar, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { departmentAPI, employeeAPI } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'

const DepartmentView: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: departmentData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentAPI.getDepartment(id!),
    enabled: Boolean(id),
  })

  const {
    data: employeesData,
    isLoading: loadingEmployees
  } = useQuery({
    queryKey: ['employees', 'by-department', id],
    queryFn: () => employeeAPI.getEmployees({ departmentId: id, limit: 50 }),
    enabled: Boolean(id),
  })

  const department = departmentData?.data
  const employees = employeesData?.data?.employees || []

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !department) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading department</p>
          <Button onClick={() => navigate('/departments')}>Back to Departments</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/departments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Departments
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{department.name}</h1>
              {getStatusBadge(department.isActive)}
            </div>
            <p className="text-gray-600">Code: {department.code}</p>
          </div>
        </div>
        <Link to={`/departments/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Department
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Department Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Department Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {department.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">
                    {department.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Department Code</label>
                  <p className="font-medium">{department.code}</p>
                </div>

                {department.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{department.location}</p>
                    </div>
                  </div>
                )}

                {department.budget && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Annual Budget</label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{formatCurrency(department.budget)}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{formatDate(department.createdAt)}</p>
                  </div>
                </div>
              </div>

              {department.manager && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Department Manager</label>
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {department.manager.firstName} {department.manager.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{department.manager.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Employees */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Department Employees ({employees.length})
                </CardTitle>
                <Link to={`/employees?departmentId=${id}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No employees in this department</p>
                  <Link to="/employees/new">
                    <Button variant="outline">
                      Add Employee
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.slice(0, 10).map((employee: any) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{employee.position.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                        <Link to={`/employees/${employee.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  
                  {employees.length > 10 && (
                    <div className="text-center pt-4">
                      <Link to={`/employees?departmentId=${id}`}>
                        <Button variant="outline">
                          View {employees.length - 10} More Employees
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Total Employees</span>
                </div>
                <span className="font-medium text-lg">{employees.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Employees</span>
                <span className="font-medium">
                  {employees.filter((emp: any) => emp.status === 'ACTIVE').length}
                </span>
              </div>

              {department.budget && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Budget</span>
                  </div>
                  <span className="font-medium">{formatCurrency(department.budget)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={`/employees/new?departmentId=${id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
              <Link to={`/employees?departmentId=${id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  View All Employees
                </Button>
              </Link>
              <Link to={`/departments/${id}/edit`}>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Department
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DepartmentView
