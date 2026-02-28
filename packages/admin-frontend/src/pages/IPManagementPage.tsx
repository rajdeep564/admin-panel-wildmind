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
    Language as IPIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface BlockedIP {
    id: string;
    ip: string;
    reason: string;
    targetUid?: string;
    blockedAt: string;
    blockedBy: string;
}

export default function IPManagementPage() {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [ips, setIPs] = useState<BlockedIP[]>([]);
    const [loading, setLoading] = useState(true);
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [blockForm, setBlockForm] = useState({ ip: '', reason: '', targetUid: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchBlockedIPs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/ips/blocked`, { withCredentials: true });
            if (res.data.success) setIPs(res.data.data.ips);
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to fetch blocked IPs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBlockedIPs(); }, []);

    const handleBlock = async () => {
        if (!blockForm.ip.trim() || !blockForm.reason.trim()) {
            showSnackbar('IP and reason are required', 'error');
            return;
        }
        try {
            setActionLoading('block');
            await axios.post(`${API_BASE_URL}/ips/block`, {
                ip: blockForm.ip.trim(),
                reason: blockForm.reason.trim(),
                targetUid: blockForm.targetUid.trim() || undefined,
            }, { withCredentials: true });
            showSnackbar('IP blocked successfully', 'success');
            setBlockDialogOpen(false);
            setBlockForm({ ip: '', reason: '', targetUid: '' });
            fetchBlockedIPs();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to block IP', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnblock = async (ip: string) => {
        try {
            setActionLoading(ip);
            await axios.delete(`${API_BASE_URL}/ips/unblock/${encodeURIComponent(ip)}`, { withCredentials: true });
            showSnackbar('IP unblocked', 'success');
            fetchBlockedIPs();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to unblock IP', 'error');
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
                    <IPIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                        IP Management
                    </Typography>
                    <Button color="inherit" variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setBlockDialogOpen(true)}>
                        Block IP
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Blocked IP addresses cannot register new accounts or log in on WildMind. You can also view and block IPs from a user's login history in User Management.
                    </Typography>
                </Paper>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                ) : ips.length === 0 ? (
                    <Alert severity="info">No IP addresses are currently blocked.</Alert>
                ) : (
                    <TableContainer component={Paper} elevation={2}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell><strong>IP Address</strong></TableCell>
                                    <TableCell><strong>Reason</strong></TableCell>
                                    <TableCell><strong>Target User</strong></TableCell>
                                    <TableCell><strong>Blocked By</strong></TableCell>
                                    <TableCell><strong>Blocked At</strong></TableCell>
                                    <TableCell align="center"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ips.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.ip}</Typography>
                                        </TableCell>
                                        <TableCell>{item.reason}</TableCell>
                                        <TableCell>{item.targetUid ? (
                                            <Chip label={item.targetUid.slice(0, 8) + '...'} size="small" variant="outlined" />
                                        ) : '—'}</TableCell>
                                        <TableCell>{item.blockedBy}</TableCell>
                                        <TableCell>{new Date(item.blockedAt).toLocaleString()}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Unblock IP">
                                                <span>
                                                    <Button
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        startIcon={actionLoading === item.ip ? <CircularProgress size={14} /> : <CheckCircleIcon />}
                                                        disabled={actionLoading === item.ip}
                                                        onClick={() => handleUnblock(item.ip)}
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

            {/* Block IP Dialog */}
            <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BlockIcon color="error" /> Block an IP Address
                </DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="IP Address *" value={blockForm.ip} onChange={(e) => setBlockForm({ ...blockForm, ip: e.target.value })} sx={{ mt: 2, mb: 2 }} placeholder="e.g. 192.168.1.100" />
                    <TextField fullWidth label="Reason *" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} sx={{ mb: 2 }} placeholder="e.g. Repeated abuse from this IP" multiline rows={2} />
                    <TextField fullWidth label="Target User UID (optional)" value={blockForm.targetUid} onChange={(e) => setBlockForm({ ...blockForm, targetUid: e.target.value })} placeholder="Firestore User ID for reference" />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" startIcon={actionLoading === 'block' ? <CircularProgress size={16} /> : <BlockIcon />} disabled={actionLoading === 'block'} onClick={handleBlock}>
                        Block IP
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
