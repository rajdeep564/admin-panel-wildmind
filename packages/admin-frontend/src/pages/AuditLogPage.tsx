import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, AppBar, Toolbar, Typography, IconButton,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Chip, TextField, CircularProgress, Alert, Button,
    Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    History as HistoryIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

const ACTION_COLORS: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
    SUSPEND_USER: 'warning',
    UNSUSPEND_USER: 'success',
    BAN_USER: 'error',
    UNBAN_USER: 'success',
    FORCE_LOGOUT: 'warning',
    SET_ROLE: 'info',
    VERIFY_EMAIL: 'success',
    BLOCK_DEVICE: 'error',
    UNBLOCK_DEVICE: 'success',
    BLOCK_IP: 'error',
    UNBLOCK_IP: 'success',
    ISSUE_WARNING: 'warning',
    DELETE_WARNING: 'default',
    ADD_CREDITS: 'success',
    DEDUCT_CREDITS: 'warning',
    SET_GLOBAL_FLAG: 'info',
    SET_USER_FLAG: 'info',
    SEND_EMAIL: 'info',
    CREATE_ANNOUNCEMENT: 'info',
    DEACTIVATE_ANNOUNCEMENT: 'default',
};

interface AuditLog {
    id: string;
    adminEmail: string;
    action: string;
    targetUid?: string;
    details: Record<string, any>;
    timestamp: string;
}

export default function AuditLogPage() {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAdmin, setFilterAdmin] = useState('');
    const [filterTarget, setFilterTarget] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = { limit: 100 };
            if (filterAdmin.trim()) params.adminEmail = filterAdmin.trim();
            if (filterTarget.trim()) params.targetUid = filterTarget.trim();
            const res = await axios.get(`${API_BASE_URL}/audit-logs`, { params, withCredentials: true });
            if (res.data.success) setLogs(res.data.data.logs);
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to fetch audit logs', 'error');
        } finally {
            setLoading(false);
        }
    }, [filterAdmin, filterTarget]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filteredLogs = filterAction
        ? logs.filter((l) => l.action === filterAction)
        : logs;

    const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <HistoryIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                        Audit Log
                    </Typography>
                    <IconButton color="inherit" onClick={fetchLogs} title="Refresh">
                        <RefreshIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* Filters */}
                <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField size="small" label="Filter by Admin Email" value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)} sx={{ minWidth: 220 }} />
                    <TextField size="small" label="Filter by Target User UID" value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} sx={{ minWidth: 220 }} />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Action</InputLabel>
                        <Select value={filterAction} label="Filter by Action" onChange={(e) => setFilterAction(e.target.value)}>
                            <MenuItem value="">All Actions</MenuItem>
                            {uniqueActions.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="outlined" size="small" onClick={fetchLogs}>Apply Filters</Button>
                </Paper>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
                ) : filteredLogs.length === 0 ? (
                    <Alert severity="info">No audit log entries found.</Alert>
                ) : (
                    <TableContainer component={Paper} elevation={2}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell><strong>Timestamp</strong></TableCell>
                                    <TableCell><strong>Admin</strong></TableCell>
                                    <TableCell><strong>Action</strong></TableCell>
                                    <TableCell><strong>Target User</strong></TableCell>
                                    <TableCell><strong>Details</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLogs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{log.adminEmail}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action}
                                                size="small"
                                                color={ACTION_COLORS[log.action] || 'default'}
                                                sx={{ fontSize: '0.65rem' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {log.targetUid ? (
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                                    {log.targetUid}
                                                </Typography>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: 'text.secondary', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {JSON.stringify(log.details)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Container>
        </Box>
    );
}
