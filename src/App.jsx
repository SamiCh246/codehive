import { Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import AppLayout from './components/AppLayout.jsx'
import { ProtectedRoute } from './components/UI.jsx'
import { NotificationProvider, ThemeProvider } from './context/AppContext.jsx'
import { LoadingProvider } from './context/LoadingContext.jsx'
import { UserRoleProvider } from './context/UserRoleContext.jsx'
import Account from './pages/Account.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import CourseCatalog from './pages/CourseCatalog.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import ProfessorDashboard from './pages/ProfessorDashboard.jsx'
import Profiles from './pages/Profiles.jsx'
import Signup from './pages/Signup.jsx'
import Social from './pages/Social.jsx'
import TACalendar from './pages/TACalendar.jsx'
import TADashboard from './pages/TADashboard.jsx'

function App() {
  return (
    <ThemeProvider>
      <UserRoleProvider>
        <NotificationProvider>
          <LoadingProvider>
          <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="ta-calendar" element={<TACalendar />} />
            <Route path="course-catalog" element={<CourseCatalog />} />
            <Route path="admin-dashboard" element={<AdminDashboard />} />
            <Route path="professor-dashboard" element={<ProfessorDashboard />} />
            <Route path="ta-dashboard" element={<TADashboard />} />
            
                        <Route path="social" element={<Social />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </LoadingProvider>
        </NotificationProvider>
      </UserRoleProvider>
    </ThemeProvider>
  )
}

export default App
