import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, MoreHorizontal, Eye, Edit, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import AdvancedEmployeeSearch from '@/components/employees/AdvancedEmployeeSearch'
import { employeeAPI } from '@/lib/api'
import { Employee, EmployeeStatus } from '@/types/employee'

interface AdvancedSearchFilters {
  query?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  status?: EmployeeStatus
  employmentType?: any
  workLocation?: any
  skills?: string[]
  hireDateFrom?: string
  hireDateTo?: string
  salaryMin?: number
  salaryMax?: number
  location?: string
}

const EmployeeList: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    departmentId: searchParams.get('departmentId') || undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const pageSize = 10

  const {
    data: employeesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['employees', { ...filters, page: currentPage }],
    queryFn: () => employeeAPI.getEmployees({
      query: filters.query,
      departmentId: filters.departmentId,
      positionId: filters.positionId,
      managerId: filters.managerId,
      status: filters.status,
      employmentType: filters.employmentType,
      workLocation: filters.workLocation,
      skills: filters.skills?.join(','),
      hireDateFrom: filters.hireDateFrom,
      hireDateTo: filters.hireDateTo,
      salaryMin: filters.salaryMin,
      salaryMax: filters.salaryMax,
      location: filters.location,
      page: currentPage,
      limit: pageSize
    })
  })

  const employees = employeesData?.data?.employees || []
  const totalCount = employeesData?.data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const handleFiltersChange = (newFilters: AdvancedSearchFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const getStatusBadge = (status: EmployeeStatus) => {
    const statusStyles = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      TERMINATED: 'bg-red-100 text-red-800',
      ON_LEAVE: 'bg-yellow-100 text-yellow-800',
      SUSPENDED: 'bg-orange-100 text-orange-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading employees</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600">Manage your organization's employees</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Link to="/employees/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced Search */}
      <AdvancedEmployeeSearch 
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory ({totalCount} employees)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedEmployees.length === employees.length && employees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployees(employees.map((emp: Employee) => emp.id))
                            } else {
                              setSelectedEmployees([])
                            }
                          }}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Position</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee: Employee) => (
                      <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployees([...selectedEmployees, employee.id])
                              } else {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id))
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {employee.firstName[0]}{employee.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{employee.department.name}</td>
                        <td className="py-3 px-4 text-gray-700">{employee.position.title}</td>
                        <td className="py-3 px-4">{getStatusBadge(employee.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Link to={`/employees/${employee.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/employees/${employee.id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bulk Actions */}
              {selectedEmployees.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <span className="text-sm text-blue-800">
                    {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export Selected
                    </Button>
                    <Button variant="outline" size="sm">
                      Bulk Update
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                      Bulk Delete
                    </Button>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} employees
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeList
