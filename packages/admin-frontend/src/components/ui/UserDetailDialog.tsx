import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  IconButton,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import UserGenerationsTab from './UserGenerationsTab';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccountBalance as AccountBalanceIcon,
  Devices as DevicesIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

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
  updatedAt?: Date | string;
  creditBalance?: number;
  deviceInfo?: {
    browser?: string;
    device?: string;
    os?: string;
  };
  totalGenerations?: number;
  [key: string]: any;
}

export default function UserDetailDialog({ open, onClose, userId }: UserDetailDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    } else {
      // Reset state when dialog closes
      setUser(null);
      setUserStats(null);
      setError('');
      setLoading(true);
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [userRes, statsRes] = await Promise.all([
         axios.get(`${API_BASE_URL}/users/${userId}`, { withCredentials: true }),
         axios.get(`${API_BASE_URL}/analytics/user/${userId}`, { withCredentials: true }).catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (userRes.data.success) {
        const userData = userRes.data.data.user;
        // Normalize dates
        if (userData.createdAt) {
          userData.createdAt = new Date(userData.createdAt);
        }
        if (userData.lastLoginAt) {
          userData.lastLoginAt = new Date(userData.lastLoginAt);
        }
        if (userData.updatedAt) {
          userData.updatedAt = new Date(userData.updatedAt);
        }
        setUser(userData);
      }
      
      if (statsRes && statsRes.data && statsRes.data.success) {
         setUserStats(statsRes.data.data);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch user details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  };

  const renderField = (label: string, value: any, icon?: React.ReactNode) => {
    if (value === undefined || value === null || value === '') return null;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
          {icon && <Box sx={{ mr: 1, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>{icon}</Box>}
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
            {label}
          </Typography>
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            ml: { xs: icon ? 3.5 : 0, sm: icon ? 4 : 0 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value, null, 2) : String(value)}
        </Typography>
      </Box>
    );
  };

  const renderObjectFields = (obj: any, prefix = '') => {
    if (!obj || typeof obj !== 'object' || obj instanceof Date) return null;

    return Object.entries(obj).map(([key, value]) => {
      if (value === null || value === undefined) return null;
      
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        return (
          <Box key={fieldKey} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
              {key}
            </Typography>
            <Box sx={{ ml: 2, mt: 0.5 }}>
              {renderObjectFields(value, fieldKey)}
            </Box>
          </Box>
        );
      }

      return renderField(
        key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        value
      );
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          maxHeight: { xs: '100vh', sm: '90vh' },
          m: { xs: 0, sm: 2 },
          maxWidth: { xs: '100%', sm: '600px' },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            User Details
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Tabs 
        value={tabValue} 
        onChange={(_, v) => setTabValue(v)} 
        sx={{ px: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" />
        <Tab label="Generations" />
      </Tabs>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {tabValue === 0 && (
          <>
            {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : user ? (
          <Box>
            {/* User Header */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, bgcolor: 'grey.50' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Avatar
                  src={user.photoURL}
                  alt={user.displayName || user.username || user.email}
                  sx={{ 
                    width: { xs: 56, sm: 64 }, 
                    height: { xs: 56, sm: 64 }, 
                    mr: { xs: 0, sm: 2 },
                    mb: { xs: 1.5, sm: 0 },
                    bgcolor: 'primary.main' 
                  }}
                >
                  {(user.displayName || user.username || user.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 0.5,
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      wordBreak: 'break-word'
                    }}
                  >
                    {user.displayName || user.username || 'No Name'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1,
                      fontSize: { xs: '0.85rem', sm: '0.875rem' },
                      wordBreak: 'break-word'
                    }}
                  >
                    {user.email || 'No email'}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    {user.isActive !== false && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Active"
                        size="small"
                        color="success"
                      />
                    )}
                    {user.emailVerified && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Email Verified"
                        size="small"
                        color="primary"
                      />
                    )}
                    {!user.emailVerified && (
                      <Chip
                        icon={<CancelIcon />}
                        label="Email Not Verified"
                        size="small"
                        color="default"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {/* Basic Information */}
              <Grid item xs={12} md={6}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '0.875rem' }
                  }}
                >
                  Basic Information
                </Typography>
                {renderField('User ID', user.uid)}
                {renderField('Email', user.email, <EmailIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                {renderField('Username', user.username, <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                {renderField('Display Name', user.displayName)}
                {renderField('Photo URL', user.photoURL)}
              </Grid>

              {/* Account Status */}
              <Grid item xs={12} md={6}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '0.875rem' }
                  }}
                >
                  Account Status
                </Typography>
                {renderField('Active Status', user.isActive !== false ? 'Active' : 'Inactive')}
                {renderField('Email Verified', user.emailVerified ? 'Yes' : 'No')}
                {renderField('Credit Balance', user.creditBalance !== undefined ? `${user.creditBalance}` : 'N/A', <AccountBalanceIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                {userStats ? (
                     <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Generation Stats</Typography>
                        <Box sx={{ ml: 0, mt: 0.5 }}>
                            <Chip size="small" label={`Total: ${userStats.total}`} sx={{ mr: 1, mb: 1 }} />
                            <Chip size="small" color="primary" label={`Images: ${userStats.images}`} sx={{ mr: 1, mb: 1 }} />
                            <Chip size="small" color="secondary" label={`Videos: ${userStats.videos}`} sx={{ mr: 1, mb: 1 }} />
                            <Chip size="small" color="warning" label={`Music: ${userStats.music}`} sx={{ mb: 1 }} />
                        </Box>
                     </Box>
                ) : (
                    renderField('Total Generations', user.totalGenerations !== undefined ? `${user.totalGenerations}` : 'N/A')
                )}
              </Grid>

              {/* Timestamps */}
              <Grid item xs={12} md={6}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '0.875rem' }
                  }}
                >
                  Timestamps
                </Typography>
                {renderField('Created At', formatDate(user.createdAt), <CalendarTodayIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                {renderField('Last Login', formatDate(user.lastLoginAt), <AccessTimeIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                {renderField('Updated At', formatDate(user.updatedAt))}
              </Grid>

              {/* Device Information */}
              {user.deviceInfo && (
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: { xs: 1.5, sm: 2 }, 
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', sm: '0.875rem' }
                    }}
                  >
                    Device Information
                  </Typography>
                  {renderField('Browser', user.deviceInfo.browser, <DevicesIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                  {renderField('Device', user.deviceInfo.device)}
                  {renderField('Operating System', user.deviceInfo.os)}
                </Grid>
              )}

              {/* All Other Fields */}
              <Grid item xs={12}>
                <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: { xs: 1.5, sm: 2 }, 
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '0.875rem' }
                  }}
                >
                  Additional Information
                </Typography>
                <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'grey.50' }}>
                  {Object.entries(user)
                    .filter(([key]) => 
                      !['uid', 'id', 'email', 'username', 'displayName', 'photoURL', 
                        'emailVerified', 'isActive', 'createdAt', 'lastLoginAt', 
                        'updatedAt', 'creditBalance', 'deviceInfo', 'totalGenerations'].includes(key)
                    )
                    .map(([key, value]) => {
                      if (value === null || value === undefined || value === '') return null;
                      return (
                        <Box key={key} sx={{ mb: { xs: 1.25, sm: 1.5 } }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              fontWeight: 600, 
                              textTransform: 'capitalize',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}
                          >
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mt: 0.5,
                              fontSize: { xs: '0.8rem', sm: '0.875rem' },
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {typeof value === 'object' && !(value instanceof Date)
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </Typography>
                        </Box>
                      );
                    })}
                  {Object.entries(user).filter(([key]) => 
                    !['uid', 'id', 'email', 'username', 'displayName', 'photoURL', 
                      'emailVerified', 'isActive', 'createdAt', 'lastLoginAt', 
                      'updatedAt', 'creditBalance', 'deviceInfo', 'totalGenerations'].includes(key) &&
                    user[key] !== null && user[key] !== undefined && user[key] !== ''
                  ).length === 0 && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontStyle: 'italic',
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      No additional information available
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ) : null}
        </>
      )}

      {tabValue === 1 && (
        <UserGenerationsTab userId={userId} />
      )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          fullWidth={isMobile}
          sx={{ 
            minWidth: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

