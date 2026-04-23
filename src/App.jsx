import { Routes, Route, Navigate } from 'react-router-dom'
import StudentEntry from './pages/StudentEntry.jsx'
import StudentHome from './pages/StudentHome.jsx'
import TeacherLogin from './pages/TeacherLogin.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentEntry />} />
      <Route path="/home" element={<StudentHome />} />
      <Route path="/teacher" element={<TeacherLogin />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
