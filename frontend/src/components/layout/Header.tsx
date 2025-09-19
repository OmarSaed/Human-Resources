import React from 'react'
import { Bell, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

interface HeaderProps {
  title?: string
}

const Header: React.FC<HeaderProps> = ({ title = 'Dashboard' }) => {
  const { user } = useAuthStore()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 w-80"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
            <Button variant="ghost" size="icon">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {user ? (
                  <span className="text-sm font-medium text-gray-700">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
