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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  Block as BlockIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Delete as DeleteIcon,
  LogoutOutlined as LogoutIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from './SnackbarProvider';

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
  isSuspended?: boolean;
  isBanned?: boolean;
  suspendReason?: string;
  banReason?: string;
  role?: string;
  warningCount?: number;
  createdAt?: Date | string;
  lastLoginAt?: Date | string;
  updatedAt?: Date | string;
  creditBalance?: number;
  deviceInfo?: { browser?: string; device?: string; os?: string };
  totalGenerations?: number;
  [key: string]: any;
}

interface Warning { id: string; reason: string; issuedAt: string; issuedBy: string; }
interface CreditEntry { id: string; amount: number; reason: string; previousBalance: number; newBalance: number; adjustedAt: string; adjustedBy: string; }
interface LoginEntry { ip?: string; deviceId?: string; browser?: string; os?: string; timestamp?: string; }

export default function UserDetailDialog({ open, onClose, userId }: UserDetailDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSnackbar } = useSnackbar();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [userStats, setUserStats] = useState<any>(null);

  // Moderation tab state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');
  const [banReason, setBanReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [warningText, setWarningText] = useState('');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [_devices, setDevices] = useState<any[]>([]);
  const [modDataLoaded, setModDataLoaded] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    } else {
      setUser(null); setUserStats(null); setError(''); setLoading(true);
      setTabValue(0); setModDataLoaded(false);
      setSuspendReason(''); setBanReason(''); setSuspendUntil('');
    }
  }, [open, userId]);

  // Load moderation data when Moderation tab is opened
  useEffect(() => {
    if (tabValue === 2 && userId && !modDataLoaded) {
      fetchModerationData();
    }
  }, [tabValue, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true); setError('');
      const [userRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/${userId}`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/analytics/user/${userId}`, { withCredentials: true }).catch(() => ({ data: { success: false, data: null } })),
      ]);
      if (userRes.data.success) {
        const userData = userRes.data.data.user;
        if (userData.createdAt) userData.createdAt = new Date(userData.createdAt);
        if (userData.lastLoginAt) userData.lastLoginAt = new Date(userData.lastLoginAt);
        if (userData.updatedAt) userData.updatedAt = new Date(userData.updatedAt);
        setUser(userData);
        setSelectedRole(userData.role || 'user');
      }
      if (statsRes?.data?.success) setUserStats(statsRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch user details');
    } finally { setLoading(false); }
  };

  const fetchModerationData = async () => {
    try {
      const [warningsRes, creditRes, devicesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/${userId}/warnings`, { withCredentials: true }).catch(() => ({ data: { success: false, data: { warnings: [] } } })),
        axios.get(`${API_BASE_URL}/users/${userId}/credit-history`, { withCredentials: true }).catch(() => ({ data: { success: false, data: { history: [] } } })),
        axios.get(`${API_BASE_URL}/users/${userId}/devices`, { withCredentials: true }).catch(() => ({ data: { success: false, data: { devices: [], loginHistory: [] } } })),
      ]);
      if (warningsRes.data.success) setWarnings(warningsRes.data.data.warnings || []);
      if (creditRes.data.success) setCreditHistory(creditRes.data.data.history || []);
      if (devicesRes.data.success) {
        setDevices(devicesRes.data.data.devices || []);
        setLoginHistory(devicesRes.data.data.loginHistory || []);
      }
      setModDataLoaded(true);
    } catch (e) { /* silent */ }
  };

  const doAction = async (actionKey: string, endpoint: string, method: 'post' | 'patch' | 'delete', body?: any) => {
    try {
      setActionLoading(actionKey);
      await axios({ method, url: `${API_BASE_URL}${endpoint}`, data: body, withCredentials: true });
      showSnackbar('Action completed successfully', 'success');
      fetchUserDetails();
      if (tabValue === 2) { setModDataLoaded(false); fetchModerationData(); }
    } catch (err: any) {
      showSnackbar(err.response?.data?.error || 'Action failed', 'error');
    } finally { setActionLoading(null); }
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
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{label}</Typography>
        </Box>
        <Typography variant="body2" sx={{ ml: { xs: icon ? 3.5 : 0, sm: icon ? 4 : 0 }, fontSize: { xs: '0.8rem', sm: '0.875rem' }, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
          {typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value, null, 2) : String(value)}
        </Typography>
      </Box>
    );
  };

  const ModerationTab = () => (
    <Box sx={{ py: 2 }}>
      {/* Account Status */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldIcon fontSize="small" /> Account Status
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {user?.isSuspended ? (
          <Button size="small" variant="outlined" color="success" startIcon={actionLoading === 'unsuspend' ? <CircularProgress size={14} /> : <CheckCircleIcon />}
            disabled={!!actionLoading} onClick={() => doAction('unsuspend', `/users/${userId}/unsuspend`, 'post')}>
            Unsuspend
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField size="small" label="Suspend Reason *" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} sx={{ minWidth: 180 }} />
            <TextField size="small" type="date" label="Until (optional)" InputLabelProps={{ shrink: true }} value={suspendUntil} onChange={(e) => setSuspendUntil(e.target.value)} sx={{ minWidth: 160 }} />
            <Button size="small" variant="outlined" color="warning"
              startIcon={actionLoading === 'suspend' ? <CircularProgress size={14} /> : <BlockIcon />}
              disabled={!!actionLoading || !suspendReason.trim()}
              onClick={() => doAction('suspend', `/users/${userId}/suspend`, 'post', { reason: suspendReason, suspendedUntil: suspendUntil || undefined })}>
              Suspend
            </Button>
          </Box>
        )}

        {user?.isBanned ? (
          <Button size="small" variant="outlined" color="success"
            startIcon={actionLoading === 'unban' ? <CircularProgress size={14} /> : <CheckCircleIcon />}
            disabled={!!actionLoading} onClick={() => doAction('unban', `/users/${userId}/unban`, 'post')}>
            Unban
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField size="small" label="Ban Reason *" value={banReason} onChange={(e) => setBanReason(e.target.value)} sx={{ minWidth: 180 }} />
            <Button size="small" variant="outlined" color="error"
              startIcon={actionLoading === 'ban' ? <CircularProgress size={14} /> : <BlockIcon />}
              disabled={!!actionLoading || !banReason.trim()}
              onClick={() => doAction('ban', `/users/${userId}/ban`, 'post', { reason: banReason })}>
              Ban User
            </Button>
          </Box>
        )}

        <Button size="small" variant="outlined" color="secondary"
          startIcon={actionLoading === 'logout' ? <CircularProgress size={14} /> : <LogoutIcon />}
          disabled={!!actionLoading}
          onClick={() => { if (window.confirm('Force logout this user from all devices?')) doAction('logout', `/users/${userId}/force-logout`, 'post'); }}>
          Force Logout
        </Button>

        {!user?.emailVerified && (
          <Button size="small" variant="outlined" color="primary"
            startIcon={actionLoading === 'verify' ? <CircularProgress size={14} /> : <EmailIcon />}
            disabled={!!actionLoading}
            onClick={() => doAction('verify', `/users/${userId}/verify-email`, 'post')}>
            Verify Email
          </Button>
        )}
      </Box>

      {(user?.isSuspended || user?.isBanned) && (
        <Alert severity={user?.isBanned ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {user?.isBanned ? `Banned: ${user.banReason}` : `Suspended: ${user.suspendReason}`}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Role Management */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon fontSize="small" /> Role Management
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select value={selectedRole} label="Role" onChange={(e) => setSelectedRole(e.target.value)}>
            {['user', 'premium', 'creator', 'moderator', 'admin'].map((r) => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" size="small" disabled={!!actionLoading || selectedRole === (user?.role || 'user')}
          startIcon={actionLoading === 'role' ? <CircularProgress size={14} /> : null}
          onClick={() => doAction('role', `/users/${userId}/role`, 'patch', { role: selectedRole })}>
          Update Role
        </Button>
        <Chip label={`Current: ${user?.role || 'user'}`} size="small" color="primary" variant="outlined" />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Credit Adjustment */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalanceIcon fontSize="small" /> Credit Adjustment
        <Chip label={`Balance: ${user?.creditBalance ?? 'N/A'}`} size="small" sx={{ ml: 1 }} />
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
        <TextField size="small" label="Amount" type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} sx={{ width: 120 }} helperText="Use negative to deduct" />
        <TextField size="small" label="Reason *" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} sx={{ minWidth: 200 }} />
        <Button variant="outlined" size="small" color="success"
          startIcon={actionLoading === 'credit' ? <CircularProgress size={14} /> : <AddIcon />}
          disabled={!!actionLoading || !creditAmount || !creditReason.trim()}
          onClick={() => doAction('credit', `/users/${userId}/adjust-credits`, 'post', { amount: parseInt(creditAmount), reason: creditReason })}>
          Apply
        </Button>
      </Box>

      {creditHistory.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Amount</TableCell><TableCell>Reason</TableCell><TableCell>New Balance</TableCell><TableCell>By</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
            <TableBody>
              {creditHistory.slice(0, 5).map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Chip label={c.amount >= 0 ? `+${c.amount}` : c.amount} size="small" color={c.amount >= 0 ? 'success' : 'error'} /></TableCell>
                  <TableCell>{c.reason}</TableCell>
                  <TableCell>{c.newBalance}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{c.adjustedBy}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{new Date(c.adjustedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Warnings */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon fontSize="small" color="warning" /> Warnings
        <Chip label={user?.warningCount || 0} size="small" color={user?.warningCount ? 'warning' : 'default'} />
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 2 }}>
        <TextField size="small" label="Warning Reason *" value={warningText} onChange={(e) => setWarningText(e.target.value)} sx={{ minWidth: 240 }} />
        <Button variant="outlined" color="warning" size="small"
          startIcon={actionLoading === 'warn' ? <CircularProgress size={14} /> : <WarningIcon />}
          disabled={!!actionLoading || !warningText.trim()}
          onClick={() => doAction('warn', `/users/${userId}/warnings`, 'post', { reason: warningText }).then(() => { setWarningText(''); })}>
          Issue Warning
        </Button>
      </Box>

      {warnings.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Reason</TableCell><TableCell>Issued By</TableCell><TableCell>Date</TableCell><TableCell align="center">Delete</TableCell></TableRow></TableHead>
            <TableBody>
              {warnings.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.reason}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{w.issuedBy}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{new Date(w.issuedAt).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => doAction(`delwarn-${w.id}`, `/users/${userId}/warnings/${w.id}`, 'delete')}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Login History + Device/IP Blocking */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DevicesIcon fontSize="small" /> Login History & Device/IP Blocking
      </Typography>
      {loginHistory.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No login history recorded for this user.</Typography>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>IP</TableCell>
                <TableCell>Device / Browser</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="center">Block IP</TableCell>
                <TableCell align="center">Block Device</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loginHistory.slice(0, 10).map((entry, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{entry.ip || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{[entry.browser, entry.os].filter(Boolean).join(' / ') || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}</TableCell>
                  <TableCell align="center">
                    {entry.ip && (
                      <Button size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', px: 0.5, py: 0.2, minWidth: 0 }}
                        onClick={async () => {
                          const reason = prompt(`Reason for blocking IP ${entry.ip}?`);
                          if (reason) {
                            try {
                              await axios.post(`${API_BASE_URL}/ips/block`, { ip: entry.ip, reason, targetUid: userId }, { withCredentials: true });
                              showSnackbar(`IP ${entry.ip} blocked`, 'success');
                            } catch (e: any) { showSnackbar(e.response?.data?.error || 'Failed', 'error'); }
                          }
                        }}>
                        Block
                      </Button>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {entry.deviceId && (
                      <Button size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', px: 0.5, py: 0.2, minWidth: 0 }}
                        onClick={async () => {
                          const reason = prompt(`Reason for blocking device ${entry.deviceId}?`);
                          if (reason) {
                            try {
                              await axios.post(`${API_BASE_URL}/devices/block`, { deviceId: entry.deviceId, reason, targetUid: userId }, { withCredentials: true });
                              showSnackbar(`Device blocked`, 'success');
                            } catch (e: any) { showSnackbar(e.response?.data?.error || 'Failed', 'error'); }
                          }
                        }}>
                        Block
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { maxHeight: { xs: '100vh', sm: '90vh' }, m: { xs: 0, sm: 2 }, maxWidth: { xs: '100%', sm: '750px' } } }}>
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>User Details</Typography>
          <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Overview" />
        <Tab label="Generations" />
        <Tab label="Moderation" icon={user?.isBanned ? <BlockIcon color="error" fontSize="small" /> : user?.isSuspended ? <WarningIcon color="warning" fontSize="small" /> : undefined} iconPosition="end" />
      </Tabs>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {tabValue === 0 && (
          <>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}><CircularProgress /></Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : user ? (
              <Box>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
                    <Avatar src={user.photoURL} alt={user.displayName || user.username || user.email} sx={{ width: { xs: 56, sm: 64 }, height: { xs: 56, sm: 64 }, mr: { xs: 0, sm: 2 }, mb: { xs: 1.5, sm: 0 }, bgcolor: 'primary.main' }}>
                      {(user.displayName || user.username || user.email || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                      <Typography variant="h6" sx={{ mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.25rem' }, wordBreak: 'break-word' }}>
                        {user.displayName || user.username || 'No Name'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.85rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                        {user.email || 'No email'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                        {user.isBanned && <Chip icon={<BlockIcon />} label="Banned" size="small" color="error" />}
                        {user.isSuspended && !user.isBanned && <Chip icon={<WarningIcon />} label="Suspended" size="small" color="warning" />}
                        {!user.isBanned && !user.isSuspended && user.isActive !== false && <Chip icon={<CheckCircleIcon />} label="Active" size="small" color="success" />}
                        {user.emailVerified && <Chip icon={<CheckCircleIcon />} label="Email Verified" size="small" color="primary" />}
                        {!user.emailVerified && <Chip icon={<CancelIcon />} label="Email Not Verified" size="small" color="default" />}
                        {user.role && user.role !== 'user' && <Chip label={user.role} size="small" color="secondary" />}
                        {(user.warningCount || 0) > 0 && <Chip icon={<WarningIcon />} label={`${user.warningCount} Warning${user.warningCount !== 1 ? 's' : ''}`} size="small" color="warning" variant="outlined" />}
                      </Box>
                    </Box>
                  </Box>
                </Paper>

                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600 }}>Basic Information</Typography>
                    {renderField('User ID', user.uid)}
                    {renderField('Email', user.email, <EmailIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                    {renderField('Username', user.username, <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                    {renderField('Display Name', user.displayName)}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600 }}>Account Status</Typography>
                    {renderField('Role', user.role || 'user')}
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
                    ) : renderField('Total Generations', user.totalGenerations !== undefined ? `${user.totalGenerations}` : 'N/A')}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600 }}>Timestamps</Typography>
                    {renderField('Created At', formatDate(user.createdAt), <CalendarTodayIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                    {renderField('Last Login', formatDate(user.lastLoginAt), <AccessTimeIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                    {renderField('Updated At', formatDate(user.updatedAt))}
                  </Grid>
                  {user.deviceInfo && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600 }}>Device Information</Typography>
                      {renderField('Browser', user.deviceInfo.browser, <DevicesIcon sx={{ fontSize: { xs: 14, sm: 16 } }} />)}
                      {renderField('Device', user.deviceInfo.device)}
                      {renderField('Operating System', user.deviceInfo.os)}
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
                    <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, sm: 2 }, fontWeight: 600 }}>Additional Information</Typography>
                    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'grey.50' }}>
                      {Object.entries(user).filter(([key]) =>
                        !['uid', 'id', 'email', 'username', 'displayName', 'photoURL', 'emailVerified', 'isActive', 'isSuspended', 'isBanned',
                          'createdAt', 'lastLoginAt', 'updatedAt', 'creditBalance', 'deviceInfo', 'totalGenerations', 'role', 'warningCount',
                          'suspendReason', 'banReason'].includes(key)
                      ).map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        return (
                          <Box key={key} sx={{ mb: { xs: 1.25, sm: 1.5 } }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'capitalize', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' }, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value, null, 2) : String(value)}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            ) : null}
          </>
        )}

        {tabValue === 1 && <UserGenerationsTab userId={userId} />}

        {tabValue === 2 && (
          loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> :
            user ? <ModerationTab /> : <Alert severity="error">User data not loaded</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        <Button onClick={onClose} variant="contained" fullWidth={isMobile} sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
