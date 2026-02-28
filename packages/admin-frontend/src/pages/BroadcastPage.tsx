import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, AppBar, Toolbar, Typography, IconButton,
    TextField, Button, CircularProgress, Alert, Tabs, Tab,
    Card, CardContent, CardHeader, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Select,
    MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Campaign as CampaignIcon,
    Email as EmailIcon,
    Notifications as AnnouncementIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface Announcement {
    id: string;
    title: string;
    body: string;
    targetGroup: string;
    active: boolean;
    createdAt: string;
    createdBy: string;
    expiresAt?: string;
}

export default function BroadcastPage() {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [tab, setTab] = useState(0);

    // Email state
    const [emailForm, setEmailForm] = useState({ uid: '', subject: '', body: '' });
    const [emailLoading, setEmailLoading] = useState(false);

    // Announcement state
    const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', targetGroup: 'all', expiresAt: '' });
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);

    const fetchAnnouncements = async () => {
        try {
            setAnnouncementsLoading(true);
            const res = await axios.get(`${API_BASE_URL}/broadcast/announcements`, { withCredentials: true });
            if (res.data.success) setAnnouncements(res.data.data.announcements);
        } catch {
            /* silent */
        } finally {
            setAnnouncementsLoading(false);
        }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const handleSendEmail = async () => {
        if (!emailForm.uid.trim() || !emailForm.subject.trim() || !emailForm.body.trim()) {
            showSnackbar('UID, subject, and body are required', 'error');
            return;
        }
        try {
            setEmailLoading(true);
            const res = await axios.post(`${API_BASE_URL}/broadcast/email`, emailForm, { withCredentials: true });
            showSnackbar(res.data.message || 'Email sent successfully', 'success');
            setEmailForm({ uid: '', subject: '', body: '' });
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setEmailLoading(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
            showSnackbar('Title and body are required', 'error');
            return;
        }
        try {
            setAnnouncementLoading(true);
            await axios.post(`${API_BASE_URL}/broadcast/announcement`, announcementForm, { withCredentials: true });
            showSnackbar('Announcement created successfully', 'success');
            setAnnouncementForm({ title: '', body: '', targetGroup: 'all', expiresAt: '' });
            fetchAnnouncements();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to create announcement', 'error');
        } finally {
            setAnnouncementLoading(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        try {
            await axios.patch(`${API_BASE_URL}/broadcast/announcements/${id}/deactivate`, {}, { withCredentials: true });
            showSnackbar('Announcement deactivated', 'success');
            fetchAnnouncements();
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to deactivate', 'error');
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <CampaignIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>Broadcast & Communications</Typography>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab icon={<EmailIcon />} label="Direct Email" iconPosition="start" />
                    <Tab icon={<AnnouncementIcon />} label="Announcements" iconPosition="start" />
                </Tabs>

                {tab === 0 && (
                    <Card elevation={2}>
                        <CardHeader title="Send Direct Email" subheader="Send a custom email to a specific user" />
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Alert severity="info">Enter the user's Firestore UID. Their email will be looked up automatically.</Alert>
                            <TextField fullWidth label="User UID *" value={emailForm.uid} onChange={(e) => setEmailForm({ ...emailForm, uid: e.target.value })} placeholder="Firestore document ID of the user" />
                            <TextField fullWidth label="Subject *" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject line" />
                            <TextField fullWidth label="Message Body *" value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Email body content..." multiline rows={6} />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button variant="contained" startIcon={emailLoading ? <CircularProgress size={16} /> : <SendIcon />} disabled={emailLoading} onClick={handleSendEmail} size="large">
                                    Send Email
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {tab === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Card elevation={2}>
                            <CardHeader title="Create Announcement" subheader="Stored in Firestore — your app can read and display these to users" />
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField fullWidth label="Title *" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
                                <TextField fullWidth label="Message *" value={announcementForm.body} onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })} multiline rows={4} />
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <FormControl size="small" sx={{ minWidth: 160 }}>
                                        <InputLabel>Target Group</InputLabel>
                                        <Select value={announcementForm.targetGroup} label="Target Group" onChange={(e) => setAnnouncementForm({ ...announcementForm, targetGroup: e.target.value })}>
                                            <MenuItem value="all">All Users</MenuItem>
                                            <MenuItem value="premium">Premium Users</MenuItem>
                                            <MenuItem value="free">Free Users</MenuItem>
                                            <MenuItem value="creator">Creators</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField size="small" label="Expires At (optional)" type="datetime-local" InputLabelProps={{ shrink: true }} value={announcementForm.expiresAt} onChange={(e) => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value })} />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" startIcon={announcementLoading ? <CircularProgress size={16} /> : <AnnouncementIcon />} disabled={announcementLoading} onClick={handleCreateAnnouncement}>
                                        Publish Announcement
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Announcements List */}
                        <Card elevation={2}>
                            <CardHeader title="Active Announcements" />
                            <CardContent>
                                {announcementsLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                                ) : announcements.length === 0 ? (
                                    <Alert severity="info">No announcements yet.</Alert>
                                ) : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                    <TableCell><strong>Title</strong></TableCell>
                                                    <TableCell><strong>Target</strong></TableCell>
                                                    <TableCell><strong>Status</strong></TableCell>
                                                    <TableCell><strong>Created</strong></TableCell>
                                                    <TableCell align="center"><strong>Action</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {announcements.map((a) => (
                                                    <TableRow key={a.id} hover>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{a.body.slice(0, 60)}...</Typography>
                                                        </TableCell>
                                                        <TableCell><Chip label={a.targetGroup} size="small" /></TableCell>
                                                        <TableCell>
                                                            <Chip label={a.active ? 'Active' : 'Inactive'} size="small" color={a.active ? 'success' : 'default'} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem' }}>{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                                                        <TableCell align="center">
                                                            {a.active && (
                                                                <Button size="small" color="warning" variant="outlined" onClick={() => handleDeactivate(a.id)}>
                                                                    Deactivate
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Container>
        </Box>
    );
}
