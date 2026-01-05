import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Palette as PaletteIcon,
  People as PeopleIcon,
  Shield as ShieldIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface DashboardCardProps {
  title: string;
  description: string;
  to?: string;
  disabled?: boolean;
  icon: React.ReactNode;
}

function DashboardCard({ title, description, to, disabled, icon }: DashboardCardProps) {
  const content = (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': disabled
          ? {}
          : {
              transform: 'translateY(-4px)',
              boxShadow: 6,
            },
      }}
    >
      <CardActionArea
        component={to ? Link : 'div'}
        to={to}
        disabled={disabled}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        <CardContent sx={{ flexGrow: 1, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                color: 'primary.main',
                mr: 1.5,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {icon}
            </Box>
            <Typography variant="h4" component="h2">
              {title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {!disabled && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                mt: 2,
              }}
            >
              <ArrowForwardIcon sx={{ color: 'primary.main' }} />
            </Box>
          )}
          {disabled && (
            <Chip
              label="Coming soon"
              size="small"
              sx={{ mt: 2 }}
              color="default"
              variant="outlined"
            />
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return content;
}

export default function DashboardPage() {
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            WildMind Admin Panel
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            Logged in as: {admin?.email}
          </Typography>
          <Button color="inherit" onClick={handleLogout} variant="outlined" size="small">
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="ArtStation Scoring"
              description="Score generations (9-10) to add them to ArtStation feed"
              to="/artstation"
              icon={<PaletteIcon fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="ArtStation Management"
              description="View and remove items currently displayed on ArtStation"
              to="/artstation-management"
              icon={<DeleteIcon fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="User Management"
              description="View and manage user accounts, plans, and credits"
              to="/users"
              icon={<PeopleIcon fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Content Moderation"
              description="Review and moderate user-generated content"
              disabled
              icon={<ShieldIcon fontSize="large" />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard
              title="Analytics"
              description="View platform analytics and usage statistics"
              to="/analytics"
              icon={<AnalyticsIcon fontSize="large" />}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
