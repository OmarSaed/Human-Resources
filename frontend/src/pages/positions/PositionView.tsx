import React from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Users, DollarSign, Building, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { positionAPI, employeeAPI } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'

const PositionView: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: positionData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['position', id],
    queryFn: () => positionAPI.getPosition(id!),
    enabled: Boolean(id),
  })

  const {
    data: employeesData,
    isLoading: loadingEmployees
  } = useQuery({
    queryKey: ['employees', 'by-position', id],
    queryFn: () => employeeAPI.getEmployees({ positionId: id, limit: 50 }),
    enabled: Boolean(id),
  })

  const position = positionData?.data
  const employees = employeesData?.data?.employees || []

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
      7: { label: 'Director', color: 'bg-indigo-100 text-indigo-800' },
      8: { label: 'VP', color: 'bg-pink-100 text-pink-800' },
      9: { label: 'C-Level', color: 'bg-gray-800 text-white' },
      10: { label: 'Executive', color: 'bg-black text-white' },
    }
    
    const config = levelConfig[level as keyof typeof levelConfig] || { label: `Level ${level}`, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !position) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading position</p>
          <Button onClick={() => navigate('/positions')}>Back to Positions</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/positions')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Positions
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{position.title}</h1>
              {getStatusBadge(position.isActive)}
              {getLevelBadge(position.level)}
            </div>
            <div className="flex items-center space-x-2 text-gray-600 mt-1">
              <Building className="w-4 h-4" />
              <span>{position.department.name}</span>
            </div>
          </div>
        </div>
        <Link to={`/positions/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Position
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Position Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Position Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Position Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {position.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">
                    {position.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{position.department.name}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Level</label>
                  <div className="mt-1">
                    {getLevelBadge(position.level)}
                  </div>
                </div>

                {(position.salaryMin || position.salaryMax) && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Salary Range</label>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">
                        {position.salaryMin && position.salaryMax 
                          ? `${formatCurrency(position.salaryMin)} - ${formatCurrency(position.salaryMax)}`
                          : position.salaryMin 
                            ? `From ${formatCurrency(position.salaryMin)}`
                            : `Up to ${formatCurrency(position.salaryMax || 0)}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{formatDate(position.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {position.requirements && position.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {position.requirements.map((requirement: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {requirement}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Responsibilities */}
          {position.responsibilities && position.responsibilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {position.responsibilities.map((responsibility: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {responsibility}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Position Employees */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Employees in this Position ({employees.length})
                </CardTitle>
                <Link to={`/employees?positionId=${id}`}>
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
                  <p className="text-gray-500 mb-4">No employees in this position</p>
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
                          <p className="text-sm text-gray-500">{employee.employeeNumber}</p>
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
                      <Link to={`/employees?positionId=${id}`}>
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

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Position Level</span>
                <span className="font-medium">{position.level}</span>
              </div>

              {(position.salaryMin || position.salaryMax) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Salary Range</span>
                  </div>
                  <span className="font-medium text-xs">
                    {position.salaryMin && position.salaryMax 
                      ? `${formatCurrency(position.salaryMin)} - ${formatCurrency(position.salaryMax)}`
                      : position.salaryMin 
                        ? `From ${formatCurrency(position.salaryMin)}`
                        : `Up to ${formatCurrency(position.salaryMax || 0)}`
                    }
                  </span>
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
              <Link to={`/employees/new?positionId=${id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
              <Link to={`/employees?positionId=${id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  View All Employees
                </Button>
              </Link>
              <Link to={`/positions/${id}/edit`}>
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Position
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PositionView
