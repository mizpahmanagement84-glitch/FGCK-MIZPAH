import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberDetails from './pages/MemberDetails';
import MyTithe from './pages/MyTithe';
import MyProject from './pages/MyProject';
import Givings from './pages/Givings';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Welfare from './pages/Welfare';
import Projects from './pages/Projects';
import Attendance from './pages/Attendance';
import Inventory from './pages/Inventory';
import Departments from './pages/Departments';
import ExportPage from './pages/Export';
import BulkSMS from './pages/BulkSMS';
import NavBar from './components/NavBar';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    if (username) setUser({ username, role });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
    navigate('/login');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('username', userData.username);
    if (userData.role) localStorage.setItem('role', userData.role);
    // members should not see the Members panel
    if (userData.role === 'member') {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="dashboard-layout">
                <NavBar user={user} onLogout={handleLogout} />
                <main className="page-content">
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="members" element={<Members />} />
                    <Route path="member-details" element={<MemberDetails />} />
                    <Route path="my-tithe" element={<MyTithe />} />
                    <Route path="my-project" element={<MyProject />} />
                    <Route path="givings" element={<Givings />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="departments" element={<Departments />} />
                    <Route path="export" element={<ExportPage />} />
                    <Route path="bulk-sms" element={<BulkSMS />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="welfare" element={<Welfare />} />
                    <Route path="" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
