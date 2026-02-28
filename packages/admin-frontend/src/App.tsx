import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './components/ui/SnackbarProvider';
import { theme } from './theme';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ArtStationScoringPage from './pages/ArtStationScoringPage';
import ArtStationManagementPage from './pages/ArtStationManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DeviceBlockingPage from './pages/DeviceBlockingPage';
import IPManagementPage from './pages/IPManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';
import BroadcastPage from './pages/BroadcastPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/artstation" element={<ArtStationScoringPage />} />
                <Route path="/artstation-management" element={<ArtStationManagementPage />} />
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/device-blocking" element={<DeviceBlockingPage />} />
                <Route path="/ip-management" element={<IPManagementPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/feature-flags" element={<FeatureFlagsPage />} />
                <Route path="/broadcast" element={<BroadcastPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
