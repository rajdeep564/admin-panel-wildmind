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
  PhoneAndroid as DeviceIcon,
  Language as IPIcon,
  History as AuditIcon,
  Flag as FlagIcon,
  Campaign as BroadcastIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface DashboardCardProps {
  title: string;
  description: string;
  to?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  badge?: string;
}

function DashboardCard({ title, description, to, disabled, icon, badge }: DashboardCardProps) {
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
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ color: 'primary.main', mr: 1.5, display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
              <Typography variant="h4" component="h2">{title}</Typography>
            </Box>
            {badge && <Chip label={badge} size="small" color="success" />}
          </Box>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
          {!disabled && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <ArrowForwardIcon sx={{ color: 'primary.main' }} />
            </Box>
          )}
          {disabled && (
            <Chip label="Coming soon" size="small" sx={{ mt: 2 }} color="default" variant="outlined" />
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

  const cards = [
    { title: 'ArtStation Scoring', description: 'Score generations (9-10) to add them to ArtStation feed', to: '/artstation', icon: <PaletteIcon fontSize="large" /> },
    { title: 'ArtStation Management', description: 'View and remove items currently displayed on ArtStation', to: '/artstation-management', icon: <DeleteIcon fontSize="large" /> },
    { title: 'User Management', description: 'View and manage user accounts, plans, and credits', to: '/users', icon: <PeopleIcon fontSize="large" /> },
    { title: 'Analytics', description: 'View platform analytics and usage statistics', to: '/analytics', icon: <AnalyticsIcon fontSize="large" /> },
    { title: 'Device Blocking', description: 'Block specific devices from accessing any account', to: '/device-blocking', icon: <DeviceIcon fontSize="large" />, badge: 'New' },
    { title: 'IP Management', description: 'Block IP addresses from login and registration', to: '/ip-management', icon: <IPIcon fontSize="large" />, badge: 'New' },
    { title: 'Audit Log', description: 'View a complete history of all admin actions', to: '/audit-log', icon: <AuditIcon fontSize="large" />, badge: 'New' },
    { title: 'Feature Flags', description: 'Toggle global and per-user feature switches', to: '/feature-flags', icon: <FlagIcon fontSize="large" />, badge: 'New' },
    { title: 'Broadcast', description: 'Send direct emails or announcements to users', to: '/broadcast', icon: <BroadcastIcon fontSize="large" />, badge: 'New' },
    { title: 'Content Moderation', description: 'Review and moderate user-generated content', disabled: true, icon: <ShieldIcon fontSize="large" /> },
  ];

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
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <DashboardCard {...card} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
