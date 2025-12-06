import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';
import UserDetailDialog from '../components/ui/UserDetailDialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface User {
  uid: string;
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt?: Date | string;
  lastLoginAt?: Date | string;
  creditBalance?: number;
  deviceInfo?: any;
  [key: string]: any;
}

export default function UserManagementPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'newer', 'older', 'alphabetical', 'date'
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch users when component mounts or filters change
  useEffect(() => {
    fetchUsers(true);
  }, [searchQuery, filterType, filterDate]);

  // Infinite scroll observer - disabled since we fetch all users at once
  // useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
  //         fetchUsers(false);
  //       }
  //     },
  //     { threshold: 0.1 }
  //   );

  //   const currentTarget = observerTarget.current;
  //   if (currentTarget) {
  //     observer.observe(currentTarget);
  //   }

  //   return () => {
  //     if (currentTarget) {
  //       observer.unobserve(currentTarget);
  //     }
  //   };
  // }, [hasMore, loadingMore, loading]);

  const fetchUsers = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setUsers([]);
        setTotalUsers(0);
      }

      // Remove limit to fetch all users
      const params: any = { limit: 10000 }; // Very high limit to get all users
      // No cursor needed since we're fetching all users
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (filterType && filterType !== 'all') {
        params.filterType = filterType;
      }
      if (filterType === 'date' && filterDate) {
        params.filterDate = filterDate;
      }

      const response = await axios.get(`${API_BASE_URL}/users`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        const newUsers = (response.data.data.users || []).map((user: any) => ({
          ...user,
          createdAt: user.createdAt ? new Date(user.createdAt) : null,
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        }));

        if (reset) {
          setUsers(newUsers);
        } else {
          // Deduplicate by uid
          setUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u.uid));
            const uniqueNew = newUsers.filter((u: User) => !existingIds.has(u.uid));
            return [...prev, ...uniqueNew];
          });
        }

        // Update total count
        setTotalUsers(response.data.data.total || 0);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch users';
      if (reset) {
        setError(errorMessage);
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedUser(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleString();
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              User Management
            </Typography>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} variant="outlined" size="small">
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {[...Array(12)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton height={24} width="60%" sx={{ mb: 1 }} />
                        <Skeleton height={20} width="80%" />
                      </Box>
                    </Box>
                    <Skeleton height={16} width="40%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={1} sx={{ top: 0, zIndex: 1100 }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: { xs: 1, sm: 2 } }}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            User Management
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            variant="outlined"
            size="small"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Logout
          </Button>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            sx={{ display: { xs: 'flex', sm: 'none' } }}
            size="small"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" sx={{ m: { xs: 1, sm: 2 } }}>
          {error}
        </Alert>
      )}

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2 } }}>
        {/* Filters and Search */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Filter Dropdown */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Users</InputLabel>
                <Select
                  value={filterType}
                  label="Users"
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    if (e.target.value !== 'date') {
                      setFilterDate(''); // Clear date when switching away from date filter
                    }
                  }}
                >
                  <MenuItem value="all">All Users </MenuItem>
                  <MenuItem value="newer">Newer Users </MenuItem>
                  <MenuItem value="older">Older Users </MenuItem>
                  <MenuItem value="alphabetical">Alphabetical (Username)</MenuItem>
                  <MenuItem value="date">Filter by Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date Picker - Show only when date filter is selected */}
            {filterType === 'date' && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Select Date"
                  type="date"
                  size="small"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            )}

            {/* Search Bar */}
            <Grid item xs={12} sm={filterType === 'date' ? 12 : 6} md={filterType === 'date' ? 6 : 9}>
              <TextField
                fullWidth
                placeholder="Search by email, username, or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        edge="end"
                      >
                        <Typography variant="caption" sx={{ cursor: 'pointer' }}>
                          Clear
                        </Typography>
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: 'background.paper' }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Total Users Count */}
        {!loading && (
          <Box sx={{ mb: 3 }}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Total Users: {totalUsers.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                {filterType === 'all' && !searchQuery && !filterDate
                  ? 'All users sorted by last login'
                  : filterType === 'newer'
                  ? 'Newer users '
                  : filterType === 'older'
                  ? 'Older users '
                  : filterType === 'alphabetical'
                  ? 'Alphabetical (Username)'
                  : filterType === 'date' && filterDate
                  ? `Users created on ${new Date(filterDate).toLocaleDateString()}`
                  : searchQuery
                  ? `Users matching "${searchQuery}"`
                  : 'Filtered users'}
              </Typography>
            </Paper>
          </Box>
        )}

        {users.length === 0 && !loading ? (
          <Box
            sx={{
              textAlign: 'center',
              py: { xs: 6, sm: 8 },
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">No users found</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {searchQuery ? 'Try adjusting your search query.' : 'No users in the database.'}
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {users.map((user) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={user.uid}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                    onClick={() => handleUserClick(user)}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={user.photoURL}
                          alt={user.displayName || user.username || user.email}
                          sx={{ width: 48, height: 48, mr: 2, bgcolor: 'primary.main' }}
                        >
                          {(user.displayName || user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {user.displayName || user.username || 'No Name'}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '0.75rem',
                            }}
                          >
                            {user.email || 'No email'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {user.username && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              @{user.username}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            Last login: {formatDate(user.lastLoginAt)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {user.isActive !== false && (
                            <Chip
                              label="Active"
                              size="small"
                              color="success"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          {user.emailVerified && (
                            <Chip
                              label="Verified"
                              size="small"
                              color="primary"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          {user.creditBalance !== undefined && (
                            <Chip
                              label={`${user.creditBalance} credits`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* All users loaded message */}
            {users.length > 0 && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing all {users.length} user{users.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* User Detail Dialog */}
      {selectedUser && (
        <UserDetailDialog
          open={detailDialogOpen}
          onClose={handleCloseDialog}
          userId={selectedUser.uid}
        />
      )}
    </Box>
  );
}

