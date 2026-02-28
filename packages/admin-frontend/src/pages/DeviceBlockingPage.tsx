import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, AppBar, Toolbar, Typography, Button, IconButton,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Chip, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    PhoneAndroid as DeviceIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface BlockedDevice {
    id: string;
    deviceId: string;
    reason: string;
    targetUid?: string;
    blockedAt: string;
    blockedBy: string;
}

export default function DeviceBlockingPage() {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [devices, setDevices] = useState<BlockedDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [blockForm, setBlockForm] = useState({ deviceId: '', reason: '', targetUid: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchBlockedDevices = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/devices/blocked`, { withCredentials: true });
            if (res.data.success) setDevices(res.data.data.devices);
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to fetch blocked devices', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBlockedDevices(); }, []);

    const handleBlock = async () => {
        if (!blockForm.deviceId.trim() || !blockForm.reason.trim()) {
            showSnackbar('Device ID and reason are required', 'error');
            return;
        }
        try {
            setActionLoading('block');
            await axios.post(`${API_BASE_URL}/devices/block`, {
                deviceId: blockForm.deviceId.trim(),
                reason: blockForm.reason.trim(),
                targetUid: blockForm.targetUid.trim() || undefined,
            }, { withCredentials: true });
            showSnackbar('Device blocked successfully', 'success');
            setBlockDialogOpen(false);
            setBlockForm({ deviceId: '', reason: '', targetUid: '' });
            fetchBlockedDevices();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to block device', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnblock = async (deviceId: string) => {
        try {
            setActionLoading(deviceId);
            await axios.delete(`${API_BASE_URL}/devices/unblock/${encodeURIComponent(deviceId)}`, { withCredentials: true });
            showSnackbar('Device unblocked', 'success');
            fetchBlockedDevices();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to unblock device', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <DeviceIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                        Device Blocking
                    </Typography>
                    <Button color="inherit" variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setBlockDialogOpen(true)}>
                        Block Device
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Blocked devices cannot log into any account on WildMind. The block is based on the device fingerprint/ID stored at login.
                    </Typography>
                </Paper>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                ) : devices.length === 0 ? (
                    <Alert severity="info">No devices are currently blocked.</Alert>
                ) : (
                    <TableContainer component={Paper} elevation={2}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell><strong>Device ID</strong></TableCell>
                                    <TableCell><strong>Reason</strong></TableCell>
                                    <TableCell><strong>Target User</strong></TableCell>
                                    <TableCell><strong>Blocked By</strong></TableCell>
                                    <TableCell><strong>Blocked At</strong></TableCell>
                                    <TableCell align="center"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {devices.map((device) => (
                                    <TableRow key={device.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                                {device.deviceId}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{device.reason}</TableCell>
                                        <TableCell>{device.targetUid ? (
                                            <Chip label={device.targetUid.slice(0, 8) + '...'} size="small" variant="outlined" />
                                        ) : '—'}</TableCell>
                                        <TableCell>{device.blockedBy}</TableCell>
                                        <TableCell>{new Date(device.blockedAt).toLocaleString()}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Unblock Device">
                                                <span>
                                                    <Button
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        startIcon={actionLoading === device.deviceId ? <CircularProgress size={14} /> : <CheckCircleIcon />}
                                                        disabled={actionLoading === device.deviceId}
                                                        onClick={() => handleUnblock(device.deviceId)}
                                                    >
                                                        Unblock
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>

            {/* Block Device Dialog */}
            <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BlockIcon color="error" /> Block a Device
                </DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Device ID *" value={blockForm.deviceId} onChange={(e) => setBlockForm({ ...blockForm, deviceId: e.target.value })} sx={{ mt: 2, mb: 2 }} placeholder="e.g. fp_abc123..." helperText="The device fingerprint/ID stored in the user's profile" />
                    <TextField fullWidth label="Reason *" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} sx={{ mb: 2 }} placeholder="e.g. Fraudulent activity detected" multiline rows={2} />
                    <TextField fullWidth label="Target User UID (optional)" value={blockForm.targetUid} onChange={(e) => setBlockForm({ ...blockForm, targetUid: e.target.value })} placeholder="Firestore User ID for reference" />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" startIcon={actionLoading === 'block' ? <CircularProgress size={16} /> : <BlockIcon />} disabled={actionLoading === 'block'} onClick={handleBlock}>
                        Block Device
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
