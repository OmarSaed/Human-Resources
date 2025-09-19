# HRMS Frontend

A modern React frontend for the Human Resource Management System, built with TypeScript, Tailwind CSS, and modern web development practices.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Tailwind CSS
- **TypeScript**: Full type safety and better developer experience
- **Authentication**: Secure login with JWT tokens and role-based access
- **Employee Management**: Comprehensive employee listing and management
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Using React Query for efficient data fetching
- **State Management**: Zustand for lightweight state management

## 🛠️ Tech Stack

- **React 18** - Latest React with hooks and concurrent features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form handling with validation
- **Zustand** - State management
- **Zod** - Schema validation
- **Lucide React** - Beautiful icons
- **Radix UI** - Accessible UI primitives

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   Update the environment variables as needed.

4. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── layout/         # Layout components (Sidebar, Header)
│   └── ui/             # Basic UI components (Button, Input, etc.)
├── pages/              # Page components
│   ├── employees/      # Employee management pages
│   └── Dashboard.tsx   # Main dashboard
├── store/              # State management
├── lib/                # Utilities and API configuration
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Check TypeScript types

## 🔐 Authentication

The application uses JWT-based authentication with:
- Login form with validation
- Automatic token refresh
- Protected routes based on user roles
- Persistent authentication state

## 👥 User Roles

The system supports different user roles:
- **Super Admin**: Full system access
- **HR Manager**: HR operations and employee management
- **HR Specialist**: Employee management and basic HR functions
- **Department Manager**: Department-specific operations
- **Employee**: Personal information and basic features

## 🎨 UI Components

The application uses a consistent design system with:
- Modern color palette with light/dark mode support
- Accessible components built on Radix UI
- Responsive design patterns
- Consistent spacing and typography
- Loading states and error handling

## 🔌 API Integration

The frontend communicates with the backend through:
- RESTful API endpoints
- Automatic token management
- Request/response interceptors
- Error handling and retry logic
- Type-safe API client

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Collapsible sidebar navigation
- Adaptive grid layouts
- Touch-friendly interactions

## 🚧 Development Status

### ✅ Completed Features
- Project setup with modern tooling
- Authentication system with login
- Main layout with responsive sidebar
- Dashboard with statistics overview
- Employee listing with search and filters
- Protected routes with role-based access

### 🔄 In Progress
- Employee profile and detail views
- Employee creation and editing forms

### 📋 Planned Features
- Time and attendance management
- Leave request management
- Performance evaluation system
- Learning and development tracking
- Recruitment and hiring workflows
- Document management
- Notification system
- Advanced reporting and analytics

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add proper error handling and loading states
4. Ensure responsive design for all components
5. Write meaningful commit messages

## 📄 License

This project is part of the HRMS system and follows the same licensing terms.
