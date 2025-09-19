import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Building, 
  Target,
  UserPlus,
  UserMinus,
  BarChart3,
  PieChart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { employeeAPI, departmentAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface AnalyticsData {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  newHiresThisMonth: number
  terminationsThisMonth: number
  averageSalary: number
  departmentBreakdown: {
    departmentId: string
    departmentName: string
    employeeCount: number
    averageSalary: number
  }[]
  positionBreakdown: {
    positionId: string
    positionTitle: string
    employeeCount: number
    level: number
  }[]
  statusBreakdown: {
    status: string
    count: number
    percentage: number
  }[]
  employmentTypeBreakdown: {
    type: string
    count: number
    percentage: number
  }[]
  workLocationBreakdown: {
    location: string
    count: number
    percentage: number
  }[]
  genderBreakdown: {
    gender: string
    count: number
    percentage: number
  }[]
  ageDistribution: {
    ageGroup: string
    count: number
    percentage: number
  }[]
  tenureDistribution: {
    tenureGroup: string
    count: number
    percentage: number
  }[]
  monthlyHiringTrends: {
    month: string
    hires: number
    terminations: number
  }[]
}

const EmployeeAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState('12months')
  const [departmentFilter, setDepartmentFilter] = useState('')

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['employee-analytics', { dateRange, departmentFilter }],
    queryFn: () => employeeAPI.getAnalytics({
      dateRange,
      departmentId: departmentFilter || undefined
    }),
  })

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments({ isActive: true }),
  })

  const departments = departmentsData?.data || []
  const analytics: AnalyticsData = analyticsData?.data || {
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    newHiresThisMonth: 0,
    terminationsThisMonth: 0,
    averageSalary: 0,
    departmentBreakdown: [],
    positionBreakdown: [],
    statusBreakdown: [],
    employmentTypeBreakdown: [],
    workLocationBreakdown: [],
    genderBreakdown: [],
    ageDistribution: [],
    tenureDistribution: [],
    monthlyHiringTrends: []
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading analytics</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Employee Analytics</h1>
          <p className="text-gray-600">Insights and statistics about your workforce</p>
        </div>
        <div className="flex space-x-2">
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="all">All Time</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index_) => (
            <Card key={index_} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalEmployees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">New Hires (Month)</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.newHiresThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <UserMinus className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Terminations (Month)</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.terminationsThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Salary</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.averageSalary ? formatCurrency(analytics.averageSalary) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Department Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.departmentBreakdown.map((dept) => (
                    <div key={dept.departmentId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dept.departmentName}</p>
                        <p className="text-sm text-gray-500">
                          Avg: {dept.averageSalary ? formatCurrency(dept.averageSalary) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{dept.employeeCount}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(dept.employeeCount / analytics.totalEmployees) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Employee Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.statusBreakdown.map((status) => (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={status.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="w-16 justify-center"
                        >
                          {status.status}
                        </Badge>
                        <span className="text-sm text-gray-600">{status.percentage}%</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{status.count}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              status.status === 'ACTIVE' ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                            style={{ width: `${status.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employment Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Employment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.employmentTypeBreakdown.map((type) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{type.type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">{type.percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{type.count}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full" 
                            style={{ width: `${type.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Work Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Work Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.workLocationBreakdown.map((location) => (
                    <div key={location.location} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{location.location}</p>
                        <p className="text-sm text-gray-500">{location.percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{location.count}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full" 
                            style={{ width: `${location.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gender Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.genderBreakdown.map((gender) => (
                    <div key={gender.gender} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{gender.gender || 'Not Specified'}</p>
                        <p className="text-sm text-gray-500">{gender.percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{gender.count}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-pink-600 h-2 rounded-full" 
                            style={{ width: `${gender.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.ageDistribution.map((age) => (
                    <div key={age.ageGroup} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{age.ageGroup}</p>
                        <p className="text-sm text-gray-500">{age.percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{age.count}</p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-teal-600 h-2 rounded-full" 
                            style={{ width: `${age.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenure Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Tenure Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {analytics.tenureDistribution.map((tenure) => (
                  <div key={tenure.tenureGroup} className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{tenure.count}</p>
                    <p className="text-sm font-medium text-gray-700">{tenure.tenureGroup}</p>
                    <p className="text-xs text-gray-500">{tenure.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hiring Trends */}
          {analytics.monthlyHiringTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Monthly Hiring Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthlyHiringTrends.slice(-6).map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                      </div>
                      <div className="flex space-x-4 text-sm">
                        <div className="text-green-600">
                          <span className="font-medium">+{month.hires}</span> hires
                        </div>
                        <div className="text-red-600">
                          <span className="font-medium">-{month.terminations}</span> exits
                        </div>
                        <div className="font-medium">
                          Net: {month.hires - month.terminations}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Position Analysis */}
          {analytics.positionBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.positionBreakdown.slice(0, 10).map((position) => (
                    <div key={position.positionId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{position.positionTitle}</p>
                        <p className="text-sm text-gray-500">Level {position.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{position.employeeCount} employees</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default EmployeeAnalytics
