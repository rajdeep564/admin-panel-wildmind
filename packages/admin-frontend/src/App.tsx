import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './components/ui/SnackbarProvider';
import { theme } from './theme';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ArtStationScoringPage from './pages/ArtStationScoringPage';
import ArtStationManagementPage from './pages/ArtStationManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

import Layout from './components/layout/Layout';

// ... (imports remain)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              {/* Authenticated Routes wrapped in Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/artstation" element={<ArtStationScoringPage />} />
                <Route path="/artstation-management" element={<ArtStationManagementPage />} />
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                {/* Redirect root to dashboard */}
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

