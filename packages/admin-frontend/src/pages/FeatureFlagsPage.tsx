import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Container, AppBar, Toolbar, Typography, IconButton,
    Switch, FormControlLabel, Divider, CircularProgress,
    Alert, TextField, Button, Card, CardContent, CardHeader,
    Grid,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Flag as FlagIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

const FLAG_DESCRIPTIONS: Record<string, string> = {
    imageGeneration: 'Allow users to generate images',
    videoGeneration: 'Allow users to generate videos',
    musicGeneration: 'Allow users to generate music',
    artStation: 'Show ArtStation feed to users',
    newUserSignup: 'Allow new user registrations',
    betaFeatures: 'Enable beta/experimental features',
    maintenanceMode: 'Show maintenance banner to all users',
};

export default function FeatureFlagsPage() {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [globalFlags, setGlobalFlags] = useState<Record<string, boolean>>({});
    const [loadingGlobal, setLoadingGlobal] = useState(true);
    const [togglingFlag, setTogglingFlag] = useState<string | null>(null);
    const [userUid, setUserUid] = useState('');
    const [userFlags, setUserFlags] = useState<Record<string, boolean> | null>(null);
    const [loadingUserFlags, setLoadingUserFlags] = useState(false);
    const [togglingUserFlag, setTogglingUserFlag] = useState<string | null>(null);

    const fetchGlobalFlags = async () => {
        try {
            setLoadingGlobal(true);
            const res = await axios.get(`${API_BASE_URL}/feature-flags`, { withCredentials: true });
            if (res.data.success) setGlobalFlags(res.data.data.flags);
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to fetch feature flags', 'error');
        } finally {
            setLoadingGlobal(false);
        }
    };

    useEffect(() => { fetchGlobalFlags(); }, []);

    const toggleGlobalFlag = async (flag: string, newValue: boolean) => {
        try {
            setTogglingFlag(flag);
            await axios.patch(`${API_BASE_URL}/feature-flags/${flag}`, { enabled: newValue }, { withCredentials: true });
            setGlobalFlags((prev) => ({ ...prev, [flag]: newValue }));
            showSnackbar(`Flag '${flag}' set to ${newValue}`, 'success');
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to update flag', 'error');
        } finally {
            setTogglingFlag(null);
        }
    };

    const fetchUserFlags = async () => {
        if (!userUid.trim()) { showSnackbar('Enter a User UID', 'error'); return; }
        try {
            setLoadingUserFlags(true);
            const res = await axios.get(`${API_BASE_URL}/feature-flags/user/${userUid.trim()}`, { withCredentials: true });
            if (res.data.success) setUserFlags(res.data.data.flags || {});
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to fetch user flags', 'error');
        } finally {
            setLoadingUserFlags(false);
        }
    };

    const toggleUserFlag = async (flag: string, newValue: boolean) => {
        if (!userUid.trim()) return;
        try {
            setTogglingUserFlag(flag);
            await axios.patch(`${API_BASE_URL}/feature-flags/user/${userUid.trim()}/${flag}`, { enabled: newValue }, { withCredentials: true });
            setUserFlags((prev) => ({ ...prev, [flag]: newValue }));
            showSnackbar(`User flag '${flag}' set to ${newValue}`, 'success');
        } catch (err: any) {
            showSnackbar(err.response?.data?.error || 'Failed to update user flag', 'error');
        } finally {
            setTogglingUserFlag(null);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <FlagIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>Feature Flags</Typography>
                    <IconButton color="inherit" onClick={fetchGlobalFlags}><RefreshIcon /></IconButton>
                </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Grid container spacing={3}>
                    {/* Global Flags */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardHeader title="Global Flags" subheader="Apply to all users unless overridden per-user" />
                            <CardContent>
                                {loadingGlobal ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                                ) : (
                                    Object.entries(globalFlags).filter(([k]) => k !== 'updatedAt').map(([flag, value]) => (
                                        <Box key={flag}>
                                            <FormControlLabel
                                                sx={{ width: '100%', justifyContent: 'space-between', ml: 0, mb: 0.5 }}
                                                control={
                                                    <Switch
                                                        checked={!!value}
                                                        disabled={togglingFlag === flag}
                                                        onChange={(e) => toggleGlobalFlag(flag, e.target.checked)}
                                                        color={flag === 'maintenanceMode' ? 'error' : 'primary'}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{flag}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{FLAG_DESCRIPTIONS[flag] || ''}</Typography>
                                                    </Box>
                                                }
                                                labelPlacement="start"
                                            />
                                            <Divider sx={{ my: 1 }} />
                                        </Box>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Per-User Flags */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2}>
                            <CardHeader title="Per-User Flag Overrides" subheader="Override flags for a specific user" />
                            <CardContent>
                                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                                    <TextField fullWidth size="small" label="User UID" value={userUid} onChange={(e) => setUserUid(e.target.value)} placeholder="Paste Firestore User ID" />
                                    <Button variant="contained" onClick={fetchUserFlags} disabled={loadingUserFlags}>
                                        {loadingUserFlags ? <CircularProgress size={20} /> : 'Load'}
                                    </Button>
                                </Box>

                                {userFlags !== null && (
                                    <>
                                        {Object.keys(globalFlags).filter(k => k !== 'updatedAt').map((flag) => (
                                            <Box key={flag}>
                                                <FormControlLabel
                                                    sx={{ width: '100%', justifyContent: 'space-between', ml: 0, mb: 0.5 }}
                                                    control={
                                                        <Switch
                                                            checked={flag in userFlags! ? !!userFlags![flag] : !!globalFlags[flag]}
                                                            disabled={togglingUserFlag === flag}
                                                            onChange={(e) => toggleUserFlag(flag, e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{flag}</Typography>
                                                            <Typography variant="caption" color={flag in userFlags! ? 'primary' : 'text.secondary'}>
                                                                {flag in userFlags! ? 'Custom override' : 'Using global default'}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    labelPlacement="start"
                                                />
                                                <Divider sx={{ my: 1 }} />
                                            </Box>
                                        ))}
                                    </>
                                )}

                                {userFlags === null && (
                                    <Alert severity="info">Enter a user UID and click Load to manage their flags.</Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
