import React from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Building2, User, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { employeeAPI } from '@/lib/api'
import { EmployeeStatus } from '@/types/employee'
import { formatDate, formatCurrency } from '@/lib/utils'

const EmployeeProfile: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: employeeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeAPI.getEmployee(id!),
    enabled: Boolean(id),
  })

  const employee = employeeData?.data

  const getStatusBadge = (status: EmployeeStatus) => {
    const statusConfig = {
      ACTIVE: { variant: 'default' as const, label: 'Active' },
      INACTIVE: { variant: 'secondary' as const, label: 'Inactive' },
      TERMINATED: { variant: 'destructive' as const, label: 'Terminated' },
      ON_LEAVE: { variant: 'outline' as const, label: 'On Leave' },
      SUSPENDED: { variant: 'destructive' as const, label: 'Suspended' },
    }

    const config = statusConfig[status]
    return (
      <Badge variant={config.variant}>
        {config.label}
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

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading employee profile</p>
          <Button onClick={() => navigate('/employees')}>Back to Employees</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              {getStatusBadge(employee.status)}
            </div>
            <p className="text-gray-600">{employee.position.title} • {employee.department.name}</p>
          </div>
        </div>
        <Link to={`/employees/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Employee Number</label>
                  <p className="font-medium">{employee.employeeNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{employee.phone}</p>
                    </div>
                  </div>
                )}
                {employee.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="font-medium">{formatDate(employee.dateOfBirth)}</p>
                  </div>
                )}
                {employee.gender && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="font-medium">{employee.gender.replace('_', ' ')}</p>
                  </div>
                )}
                {employee.maritalStatus && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marital Status</label>
                    <p className="font-medium">{employee.maritalStatus}</p>
                  </div>
                )}
                {employee.nationality && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nationality</label>
                    <p className="font-medium">{employee.nationality}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="font-medium">{employee.department.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Position</label>
                  <p className="font-medium">{employee.position.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Employment Type</label>
                  <p className="font-medium">{employee.employmentType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Work Location</label>
                  <p className="font-medium">{employee.workLocation}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Hire Date</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{formatDate(employee.hireDate)}</p>
                  </div>
                </div>
                {employee.manager && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Manager</label>
                    <p className="font-medium">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          {employee.address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{employee.address.street}</p>
                  <p className="text-gray-600">
                    {employee.address.city}, {employee.address.state} {employee.address.zipCode}
                  </p>
                  <p className="text-gray-600">{employee.address.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          {employee.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="font-medium">{employee.emergencyContact.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Relationship</label>
                    <p className="font-medium">{employee.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{employee.emergencyContact.phone}</p>
                    </div>
                  </div>
                  {employee.emergencyContact.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{employee.emergencyContact.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Tenure</span>
                </div>
                <span className="font-medium">
                  {Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years
                </span>
              </div>
              {employee.baseSalary && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Salary</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(employee.baseSalary, employee.currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payroll Schedule</span>
                <span className="font-medium">{employee.payrollSchedule.replace('_', '-')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                View Attendance
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="w-4 h-4 mr-2" />
                Performance Reviews
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Profile updated</span>
                  <span className="text-gray-500 ml-auto">2 days ago</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Clock in</span>
                  <span className="text-gray-500 ml-auto">Today 9:00 AM</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Leave request submitted</span>
                  <span className="text-gray-500 ml-auto">1 week ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {employee.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EmployeeProfile
