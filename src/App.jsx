import { Routes, Route, Navigate } from 'react-router-dom'
import StudentEntry from './pages/StudentEntry.jsx'
import StudentHome from './pages/StudentHome.jsx'
import TeacherLogin from './pages/TeacherLogin.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import DevPreview from './pages/DevPreview.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentEntry />} />
      <Route path="/home" element={<StudentHome />} />
      <Route path="/teacher" element={<TeacherLogin />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="/dev/preview" element={<DevPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
