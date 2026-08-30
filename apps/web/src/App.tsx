import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth-store';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import MyWork from './pages/MyWork';
import Board from './pages/Board';
import Admin from './pages/Admin';
import Projects from './pages/Projects';
import WorkList from './pages/WorkList';
import Insights from './pages/Insights';

export default function App() {
  const user = useAuth((s) => s.user);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // تغییر رمز اجباری، بقیه مسیرها را مسدود می‌کند. (PM-A4)
  if (user.mustChangePassword) {
    return (
      <Routes>
        <Route path="*" element={<ChangePassword />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/my-work" replace />} />
        <Route path="/my-work" element={<MyWork />} />
        <Route path="/board" element={<Board />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/work" element={<WorkList />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/my-work" replace />} />
      </Routes>
    </AppShell>
  );
}
