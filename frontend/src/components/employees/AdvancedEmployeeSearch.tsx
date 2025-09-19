import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, X, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { departmentAPI, positionAPI } from '@/lib/api'
import { EmployeeStatus, EmploymentType, WorkLocation } from '@/types/employee'

interface AdvancedSearchFilters {
  query?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  status?: EmployeeStatus
  employmentType?: EmploymentType
  workLocation?: WorkLocation
  skills?: string[]
  hireDateFrom?: string
  hireDateTo?: string
  salaryMin?: number
  salaryMax?: number
  location?: string
}

interface AdvancedEmployeeSearchProps {
  onFiltersChange: (filters: AdvancedSearchFilters) => void
  initialFilters?: AdvancedSearchFilters
}

const AdvancedEmployeeSearch: React.FC<AdvancedEmployeeSearchProps> = ({
  onFiltersChange,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState<AdvancedSearchFilters>(initialFilters)
  const [isExpanded, setIsExpanded] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  // Fetch departments and positions for filters
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentAPI.getDepartments({ isActive: true }),
  })

  const { data: positionsData } = useQuery({
    queryKey: ['positions', filters.departmentId],
    queryFn: () => positionAPI.getPositions({ 
      departmentId: filters.departmentId,
      isActive: true 
    }),
    enabled: Boolean(filters.departmentId),
  })

  const departments = departmentsData?.data || []
  const positions = positionsData?.data || []

  const updateFilter = (key: keyof AdvancedSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    
    // Clear dependent filters
    if (key === 'departmentId') {
      newFilters.positionId = undefined
    }
    
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const addSkill = () => {
    if (skillInput.trim() && !filters.skills?.includes(skillInput.trim())) {
      const newSkills = [...(filters.skills || []), skillInput.trim()]
      updateFilter('skills', newSkills)
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    const newSkills = filters.skills?.filter(skill => skill !== skillToRemove) || []
    updateFilter('skills', newSkills.length > 0 ? newSkills : undefined)
  }

  const clearAllFilters = () => {
    setFilters({})
    onFiltersChange({})
    setSkillInput('')
  }

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== ''
    }).length
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Employee Search
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {isExpanded ? 'Simple Search' : 'Advanced Search'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div>
          <Input
            type="text"
            placeholder="Search by name, email, or employee number..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            {/* Basic Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Select
                  value={filters.departmentId || ''}
                  onChange={(e) => updateFilter('departmentId', e.target.value || undefined)}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <Select
                  value={filters.positionId || ''}
                  onChange={(e) => updateFilter('positionId', e.target.value || undefined)}
                  disabled={!filters.departmentId}
                >
                  <option value="">All Positions</option>
                  {positions.map((pos: any) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => updateFilter('status', e.target.value || undefined)}
                >
                  <option value="">All Statuses</option>
                  <option value={EmployeeStatus.ACTIVE}>Active</option>
                  <option value={EmployeeStatus.INACTIVE}>Inactive</option>
                  <option value={EmployeeStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmployeeStatus.TERMINATED}>Terminated</option>
                  <option value={EmployeeStatus.SUSPENDED}>Suspended</option>
                </Select>
              </div>
            </div>

            {/* Employment Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type
                </label>
                <Select
                  value={filters.employmentType || ''}
                  onChange={(e) => updateFilter('employmentType', e.target.value || undefined)}
                >
                  <option value="">All Types</option>
                  <option value={EmploymentType.FULL_TIME}>Full Time</option>
                  <option value={EmploymentType.PART_TIME}>Part Time</option>
                  <option value={EmploymentType.CONTRACT}>Contract</option>
                  <option value={EmploymentType.INTERN}>Intern</option>
                  <option value={EmploymentType.TEMPORARY}>Temporary</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Location
                </label>
                <Select
                  value={filters.workLocation || ''}
                  onChange={(e) => updateFilter('workLocation', e.target.value || undefined)}
                >
                  <option value="">All Locations</option>
                  <option value={WorkLocation.OFFICE}>Office</option>
                  <option value={WorkLocation.REMOTE}>Remote</option>
                  <option value={WorkLocation.HYBRID}>Hybrid</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <Input
                  type="text"
                  placeholder="City, Country..."
                  value={filters.location || ''}
                  onChange={(e) => updateFilter('location', e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Date Range Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Hire Date From
                </label>
                <Input
                  type="date"
                  value={filters.hireDateFrom || ''}
                  onChange={(e) => updateFilter('hireDateFrom', e.target.value || undefined)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Hire Date To
                </label>
                <Input
                  type="date"
                  value={filters.hireDateTo || ''}
                  onChange={(e) => updateFilter('hireDateTo', e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Salary Range Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Minimum Salary
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 50000"
                  value={filters.salaryMin || ''}
                  onChange={(e) => updateFilter('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Maximum Salary
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 150000"
                  value={filters.salaryMax || ''}
                  onChange={(e) => updateFilter('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <div className="flex space-x-2 mb-2">
                <Input
                  type="text"
                  placeholder="Add skill (e.g., JavaScript, Management)..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  className="flex-1"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              
              {filters.skills && filters.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount !== 1 ? 's' : ''}` : 'No filters applied'}
              </div>
              
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdvancedEmployeeSearch
