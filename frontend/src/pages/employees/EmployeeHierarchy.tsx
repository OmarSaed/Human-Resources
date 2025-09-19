import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Search, 
  Building, 
  Mail, 
  Phone,
  ChevronDown,
  ChevronRight,
  Expand,
  Minimize
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { employeeAPI, departmentAPI } from '@/lib/api'
import { debounce } from '@/lib/utils'

interface HierarchyNode {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  position: {
    id: string
    title: string
    level: number
  }
  department: {
    id: string
    name: string
  }
  profilePicture?: string
  status: string
  directReports: HierarchyNode[]
  totalReports: number
}

interface EmployeeNodeProps {
  employee: HierarchyNode
  level?: number
  isExpanded?: boolean
  onToggleExpand?: () => void
  searchTerm?: string
}

const EmployeeNode: React.FC<EmployeeNodeProps> = ({ 
  employee, 
  level = 0, 
  isExpanded = true,
  onToggleExpand,
  searchTerm = ''
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded)
  const hasDirectReports = employee.directReports.length > 0
  
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand()
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  const isHighlighted = searchTerm && (
    employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={`ml-${level * 6}`}>
      <Card className={`mb-4 ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Expand/Collapse Button */}
              {hasDirectReports && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleToggle}
                  className="p-1"
                >
                  {localExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              )}
              
              {/* Employee Photo */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                {employee.profilePicture ? (
                  <img
                    src={employee.profilePicture}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </span>
                )}
              </div>
              
              {/* Employee Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </div>
                <p className="text-gray-600">{employee.position.title}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Building className="w-3 h-3" />
                    <span>{employee.department.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Mail className="w-3 h-3" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Phone className="w-3 h-3" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reports Count */}
              {hasDirectReports && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {employee.directReports.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    Direct Reports
                  </div>
                  {employee.totalReports > employee.directReports.length && (
                    <div className="text-xs text-gray-400">
                      {employee.totalReports} total
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Direct Reports */}
      {hasDirectReports && localExpanded && (
        <div className="ml-8 border-l-2 border-gray-200 pl-4">
          {employee.directReports.map((report) => (
            <EmployeeNode 
              key={report.id} 
              employee={report} 
              level={level + 1}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const EmployeeHierarchy: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree')
  const [expandAll, setExpandAll] = useState(true)

  // Fetch hierarchy data
  const { data: hierarchyData, isLoading, error } = useQuery({
    queryKey: ['employee-hierarchy', { departmentFilter }],
    queryFn: () => employeeAPI.getHierarchy({
      departmentId: departmentFilter || undefined
    }),
  })

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments({ isActive: true }),
  })

  const departments = departmentsData?.data || []
  const hierarchy: HierarchyNode[] = hierarchyData?.data || []

  const debouncedSearch = React.useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term)
    }, 300),
    []
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }

  const flattenHierarchy = (nodes: HierarchyNode[]): HierarchyNode[] => {
    let flat: HierarchyNode[] = []
    
    const traverse = (node: HierarchyNode) => {
      flat.push(node)
      node.directReports.forEach(traverse)
    }
    
    nodes.forEach(traverse)
    return flat
  }

  const filteredEmployees = React.useMemo(() => {
    if (!searchTerm) return hierarchy
    
    const flat = flattenHierarchy(hierarchy)
    return flat.filter(emp => 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [hierarchy, searchTerm])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading hierarchy</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
          <p className="text-gray-600">Visual representation of your organizational structure</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={expandAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? <Minimize className="w-4 h-4 mr-1" /> : <Expand className="w-4 h-4 mr-1" />}
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(viewMode === 'tree' ? 'flat' : 'tree')}
          >
            {viewMode === 'tree' ? 'Tree View' : 'Flat View'}
          </Button>
        </div>
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
                placeholder="Search employees, positions, or departments..."
                className="pl-10"
                onChange={handleSearchChange}
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : hierarchy.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No organizational data found</p>
              <p className="text-sm text-gray-400">
                Make sure employees have manager relationships configured
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {searchTerm && viewMode === 'tree' ? (
            // Search Results - Flat View
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Search Results ({filteredEmployees.length})
              </h2>
              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <EmployeeNode 
                    key={employee.id} 
                    employee={employee} 
                    searchTerm={searchTerm}
                  />
                ))}
              </div>
            </div>
          ) : viewMode === 'flat' ? (
            // Flat View
            <div>
              <h2 className="text-lg font-semibold mb-4">
                All Employees ({flattenHierarchy(hierarchy).length})
              </h2>
              <div className="space-y-4">
                {flattenHierarchy(hierarchy).map((employee) => (
                  <EmployeeNode 
                    key={employee.id} 
                    employee={employee} 
                    searchTerm={searchTerm}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Tree View
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Organization Structure
              </h2>
              {hierarchy.map((topLevel) => (
                <EmployeeNode 
                  key={topLevel.id} 
                  employee={topLevel} 
                  isExpanded={expandAll}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {hierarchy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {hierarchy.length}
                </div>
                <div className="text-sm text-gray-600">Top Level</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {flattenHierarchy(hierarchy).length}
                </div>
                <div className="text-sm text-gray-600">Total Employees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {flattenHierarchy(hierarchy).filter(emp => emp.directReports.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Managers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...flattenHierarchy(hierarchy).map(emp => emp.position.level))}
                </div>
                <div className="text-sm text-gray-600">Max Level</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EmployeeHierarchy
