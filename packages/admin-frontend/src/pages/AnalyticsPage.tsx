import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  // Divider, // Removed unused
} from '@mui/material';
import {
  TrendingUp,
  People,
  Image as ImageIcon,
  Assessment,
} from '@mui/icons-material';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import CustomDateRangePicker from '../components/CustomDateRangePicker';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

type TimeRange = '24h' | '7d' | '30d' | 'all';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topGenerators, setTopGenerators] = useState<any[]>([]);
  
  // New state for enhanced analytics
  const [breakdown, setBreakdown] = useState<any>(null);
  const [userGrowth, setUserGrowth] = useState<any>(null);
  const [modelStats, setModelStats] = useState<any>(null);
  
  // Global time range state (controls ALL data)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  // const [breakdownError, setBreakdownError] = useState<string | null>(null); // Removed unused

  // Fetch ALL data when time range changes
  useEffect(() => {
    fetchData();
    fetchBreakdown();
    fetchUserGrowth();
    fetchModelStats();
  }, [timeRange, customStartDate, customEndDate]);

  const fetchBreakdown = async () => {
    try {
      // setBreakdownError(null);
      const res = await axios.get(
        `${API_BASE_URL}/analytics/breakdown?range=${timeRange}`,
        { withCredentials: true }
      );
      setBreakdown(res.data.data);
    } catch (error) {
      console.error('Failed to fetch breakdown:', error);
      // setBreakdownError('Failed to load breakdown data');
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/analytics/growth`,
        { withCredentials: true }
      );
      setUserGrowth(res.data.data);
    } catch (error) {
      console.error('Failed to fetch user growth:', error);
    }
  };

  const fetchModelStats = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/analytics/models?range=30d`,
        { withCredentials: true }
      );
      setModelStats(res.data.data);
    } catch (error) {
      console.error('Failed to fetch model stats:', error);
    }
  };


  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const getDates = () => {
        const end = new Date();
        const start = new Date();
        // Reset to end of day for consistency? No, exact time is fine for '24h', 
        // but for 7d/30d usually we want full days.
        if (timeRange === '24h') {
             start.setHours(start.getHours() - 24);
        } else if (timeRange === '7d') {
             start.setDate(start.getDate() - 7);
             start.setHours(0,0,0,0);
        } else if (timeRange === '30d') {
             start.setDate(start.getDate() - 30);
             start.setHours(0,0,0,0);
        } else if (timeRange === 'all') {
             start.setFullYear(2020); 
        }
        
        return { 
            startDate: start.toISOString().split('T')[0], 
            endDate: end.toISOString().split('T')[0],
            days: timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30 
        };
      };

      const { startDate, endDate, days } = getDates();

      // For stats, we might want 'All Time' mostly, but top generators should default to range?
      // User requested "daily top generators, weekly top generators..."
      // So logic:
      // - Stats (Total Users, Total Gens): Keep as All Time usually.
      // - Timeline: Filter by range.
      // - Top Generators: Filter by range.
      // - Active Users: Usually recent.

      const [statsRes, timelineRes, topUsersRes, topGenRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/analytics/stats`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/analytics/timeline?startDate=${startDate}&endDate=${endDate}&days=${days}`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/analytics/top-users`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/analytics/top-generators?startDate=${startDate}&endDate=${endDate}`, { withCredentials: true }),
      ]);

      setStats(statsRes.data.data);
      setTimelineData(timelineRes.data.data);
      setTopUsers(topUsersRes.data.data);
      setTopGenerators(topGenRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: TimeRange | null) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Analytics Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            aria-label="time range"
            size="small"
          >
            <ToggleButton value="24h" aria-label="24 hours">24h</ToggleButton>
            <ToggleButton value="7d" aria-label="7 days">7D</ToggleButton>
            <ToggleButton value="30d" aria-label="30 days">30D</ToggleButton>
            <ToggleButton value="all" aria-label="all time">All</ToggleButton>
          </ToggleButtonGroup>
          <Button 
            variant={showCustomDatePicker ? "contained" : "outlined"}
            size="small"
            onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
          >
            Custom Range
          </Button>
        </Box>
      </Box>

      {/* Custom Date Range Picker */}
      {showCustomDatePicker && (
        <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
          <CustomDateRangePicker 
            onApply={({ startDate, endDate }) => {
              setCustomStartDate(startDate);
              setCustomEndDate(endDate);
              setTimeRange('custom' as TimeRange);
              setShowCustomDatePicker(false);
            }}
          />
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <button
            onClick={() => {
              fetchData();
              fetchBreakdown();
              fetchUserGrowth();
              fetchModelStats();
            }}
            style={{
              marginTop: '16px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText', mr: 3 }}>
                  <People fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
                  <Typography variant="caption" color="success.main">+{stats?.newUsersToday} today</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.contrastText', mr: 3 }}>
                  <ImageIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.totalGenerations}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Generations</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText', mr: 3 }}>
                  <TrendingUp fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">Active</Typography>
                  <Typography variant="body2" color="text.secondary">System Status</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* User Growth Metrics */}
          {userGrowth && (
            <>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>User Growth Analytics</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      New Today
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {userGrowth.newToday}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      New This Week
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {userGrowth.newThisWeek}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      New This Month
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {userGrowth.newThisMonth}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      Active (7 days)
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {userGrowth.activeLastWeek}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}

          {/* Charts Row */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Growth Trends ({timeRange === 'all' ? 'All Time' : timeRange})</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Users" />
                  <Area type="monotone" dataKey="generations" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Generations" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Generations by Type</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {breakdown ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Images', value: breakdown.breakdown.image || 0, fill: '#8884d8' },
                          { name: 'Videos', value: breakdown.breakdown.video || 0, fill: '#82ca9d' },
                          { name: 'Music', value: breakdown.breakdown.music || 0, fill: '#ffc658' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <CircularProgress />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Total: {breakdown?.total || 0} generations
              </Typography>
            </Paper>
          </Grid>

          {/* Tables Row */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 0, overflow: 'hidden', height: 400, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                 <Typography variant="h6">Recently Active Users</Typography>
              </Box>
              <TableContainer sx={{ flexGrow: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Last Active</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topUsers.map((user) => (
                      <TableRow key={user.uid} hover>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={user.photoURL} sx={{ width: 24, height: 24 }}>
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </Avatar>
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                              <Typography variant="body2" noWrap>{user.displayName || user.username || 'User'}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap display="block">{user.email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                           {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-US", { 
                               month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" 
                           }) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 0, overflow: 'hidden', height: 400, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                 <Typography variant="h6">Top Generators ({timeRange})</Typography>
              </Box>
              <TableContainer sx={{ flexGrow: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Generations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topGenerators.length > 0 ? topGenerators.map((user, idx) => (
                      <TableRow key={user.uid} hover>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ minWidth: 24, fontWeight: 'bold', color: 'text.secondary', mr: 1 }}>#{idx + 1}</Box>
                          <Avatar src={user.photoURL} sx={{ width: 24, height: 24 }}>
                              {(user.displayName || user.username || 'U')[0].toUpperCase()}
                          </Avatar>
                          <Box sx={{ ml: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                              <Typography variant="body2" noWrap>{user.username || user.email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                           <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>{user.totalGenerations}</Box>
                        </TableCell>
                      </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No generation data available yet.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Model Performance Table */}
          {modelStats && modelStats.models && modelStats.models.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 0, overflow: 'hidden' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">Model Performance (Last 30 Days)</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Model</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Successful</TableCell>
                        <TableCell align="right">Failed</TableCell>
                        <TableCell align="right">Success Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {modelStats.models.map((model: any) => (
                        <TableRow key={model.model}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Assessment fontSize="small" color="action" />
                              {model.model}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {model.total}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main">
                              {model.successful}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="error.main">
                              {model.failed}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box 
                              sx={{ 
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: model.successRate >= 90 ? 'success.light' : 
                                         model.successRate >= 70 ? 'warning.light' : 'error.light',
                                color: model.successRate >= 90 ? 'success.dark' : 
                                       model.successRate >= 70 ? 'warning.dark' : 'error.dark',
                                fontWeight: 'bold',
                                fontSize: '0.875rem'
                              }}
                            >
                              {(Number(model.successRate) || 0).toFixed(1)}%
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}

        </Grid>
      )}
    </Container>
  );
}
