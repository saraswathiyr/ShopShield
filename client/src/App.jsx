import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ScannerPage from './pages/ScannerPage'
import ScanResultPage from './pages/ScanResultPage'
import ReportPage from './pages/ReportPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import NotFoundPage from './pages/NotFoundPage'

function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="page-shell">{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  const [adminKey, setAdminKey] = useState('')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SiteLayout><LandingPage /></SiteLayout>} />
        <Route path="/dashboard" element={<SiteLayout><DashboardPage /></SiteLayout>} />
        <Route path="/scan" element={<SiteLayout><ScannerPage /></SiteLayout>} />
        <Route path="/results" element={<SiteLayout><ScanResultPage /></SiteLayout>} />
        <Route path="/report" element={<SiteLayout><ReportPage /></SiteLayout>} />
        <Route
          path="/admin"
          element={adminKey
            ? <Navigate to="/admin/reports" replace />
            : <SiteLayout><AdminLoginPage onAuthenticated={setAdminKey} /></SiteLayout>}
        />
        <Route
          path="/admin/reports"
          element={adminKey
            ? <SiteLayout><AdminDashboardPage adminKey={adminKey} onLogout={() => setAdminKey('')} /></SiteLayout>
            : <Navigate to="/admin" replace />}
        />
        <Route path="*" element={<SiteLayout><NotFoundPage /></SiteLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
