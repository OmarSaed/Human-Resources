import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Users,
  UserCheck,
  Calendar,
  Target,
  BookOpen,
  UserPlus,
  FileText,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Building,
  User
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Employees',
    icon: Users,
    href: '/employees',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER']
  },
  {
    title: 'Departments',
    icon: Building,
    href: '/departments',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER']
  },
  {
    title: 'Positions',
    icon: Target,
    href: '/positions',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER']
  },
  {
    title: 'Attendance',
    icon: UserCheck,
    href: '/attendance',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Leave Management',
    icon: Calendar,
    href: '/leave',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Performance',
    icon: Target,
    href: '/performance',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Learning',
    icon: BookOpen,
    href: '/learning',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Recruitment',
    icon: UserPlus,
    href: '/recruitment',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST']
  },
  {
    title: 'Documents',
    icon: FileText,
    href: '/documents',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
  {
    title: 'Notifications',
    icon: Bell,
    href: '/notifications',
    roles: ['SUPER_ADMIN', 'HR_MANAGER', 'HR_SPECIALIST', 'DEPARTMENT_MANAGER', 'EMPLOYEE']
  },
]

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const filteredMenuItems = menuItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  )

  return (
    <div className={cn(
      "relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">HR</span>
            </div>
            <span className="font-semibold text-gray-900">HRMS</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className={cn(
                "flex-shrink-0 w-5 h-5",
                isActive ? "text-blue-700" : "text-gray-500"
              )} />
              {!collapsed && (
                <span className="ml-3">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-3">
        {!collapsed && user && (
          <div className="flex items-center space-x-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <Link
            to="/profile"
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              location.pathname === '/profile'
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
            title={collapsed ? 'Profile' : undefined}
          >
            <User className="flex-shrink-0 w-5 h-5 text-gray-500" />
            {!collapsed && <span className="ml-3">Profile</span>}
          </Link>
          
          <Link
            to="/settings"
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              location.pathname === '/settings'
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="flex-shrink-0 w-5 h-5 text-gray-500" />
            {!collapsed && <span className="ml-3">Settings</span>}
          </Link>
          
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="flex-shrink-0 w-5 h-5 text-gray-500" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
