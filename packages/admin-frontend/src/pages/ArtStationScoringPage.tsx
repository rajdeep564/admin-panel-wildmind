import { useState, useEffect, useRef } from 'react';
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
  CardMedia,
  CardContent,
  ButtonGroup,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Skeleton,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  ImageNotSupported as ImageNotSupportedIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useSnackbar } from '../components/ui/SnackbarProvider';
import ArtStationFiltersComponent, { ArtStationFilters } from '../components/ui/ArtStationFilters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface Generation {
  id: string;
  prompt: string;
  generationType: string;
  aestheticScore: number | null;
  images: Array<{ url: string; id: string; thumbUrl?: string; avifUrl?: string; storagePath?: string; originalUrl?: string }>;
  videos: Array<{ url: string; id: string; thumbUrl?: string; storagePath?: string; originalUrl?: string }>;
  audios?: Array<{ url: string; id: string }>;
  createdAt: any;
  updatedAt?: any;
  createdBy: any;
  isPublic?: boolean;
  isDeleted?: boolean;
  visibility?: string;
  [key: string]: any; // Allow other fields from full object
}

export default function ArtStationScoringPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ArtStationFilters>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ uid: string; email?: string; username?: string }>>([]);
  const [selectedGenerations, setSelectedGenerations] = useState<Set<string>>(new Set());
  const [bulkScoreDialogOpen, setBulkScoreDialogOpen] = useState(false);
  const [pendingBulkScore, setPendingBulkScore] = useState<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch generations when filters change
  useEffect(() => {
    fetchGenerations(true);
  }, [filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchGenerations(false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/generations/filter-options`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setAvailableModels(response.data.data.models || []);
        setAvailableUsers(response.data.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const fetchGenerations = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setGenerations([]);
        setNextCursor(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const params: any = { limit: 20 };
      if (nextCursor && !reset) {
        params.cursor = nextCursor;
      }

      // Add filters to params
      if (filters.generationType) {
        params.generationType = filters.generationType;
      }
      if (filters.model) {
        params.model = filters.model;
      }
      if (filters.createdBy) {
        params.createdBy = filters.createdBy;
      }
      if (filters.dateStart) {
        params.dateStart = filters.dateStart;
      }
      if (filters.dateEnd) {
        params.dateEnd = filters.dateEnd;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.minScore !== undefined) {
        params.minScore = filters.minScore;
      }
      if (filters.maxScore !== undefined) {
        params.maxScore = filters.maxScore;
      }

      const response = await axios.get(`${API_BASE_URL}/generations`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        const newGenerations = (response.data.data.generations || [])
          // Additional safety filter on frontend
          .filter((gen: Generation) => {
            // Filter out deleted items
            if (gen.isDeleted === true) {
              return false;
            }
            // Filter out private items
            if (gen.isPublic === false || gen.visibility === 'private') {
              return false;
            }
            // Only include items with media
            const hasImages = gen.images && gen.images.length > 0;
            const hasVideos = gen.videos && gen.videos.length > 0;
            return hasImages || hasVideos;
          });
        
        if (reset) {
          setGenerations(newGenerations);
        } else {
          setGenerations((prev) => [...prev, ...newGenerations]);
        }

        setNextCursor(response.data.data.nextCursor || null);
        setHasMore(response.data.data.hasMore || false);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch generations';
      if (reset) {
        setError(errorMessage);
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateScore = async (generationId: string, score: number) => {
    try {
      setUpdating(generationId);
      const response = await axios.put(
        `${API_BASE_URL}/generations/${generationId}/score`,
        { score },
        { withCredentials: true }
      );
      if (response.data.success) {
        setGenerations((prev) =>
          prev.map((gen) =>
            gen.id === generationId ? { ...gen, aestheticScore: score } : gen
          )
        );
        showSnackbar(`Score updated to ${score}`, 'success');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update score';
      showSnackbar(errorMessage, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleScoreChange = (generationId: string, score: number) => {
    if (score >= 9 && score <= 10) {
      updateScore(generationId, score);
    } else {
      showSnackbar('ArtStation scores must be between 9 and 10', 'warning');
    }
  };

  const handleSelectGeneration = (id: string, isSelected: boolean) => {
    setSelectedGenerations((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGenerations.size === generations.length) {
      setSelectedGenerations(new Set());
    } else {
      setSelectedGenerations(new Set(generations.map((gen) => gen.id)));
    }
  };

  const handleBulkScoreClick = (score: number) => {
    if (selectedGenerations.size === 0) {
      showSnackbar('Please select at least one generation', 'warning');
      return;
    }
    setPendingBulkScore(score);
    setBulkScoreDialogOpen(true);
  };

  const handleBulkScoreConfirm = async () => {
    if (!pendingBulkScore || selectedGenerations.size === 0) {
      setBulkScoreDialogOpen(false);
      return;
    }

    setBulkScoreDialogOpen(false);
    setBulkUpdating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/generations/bulk-score`,
        {
          bulk: Array.from(selectedGenerations),
          score: pendingBulkScore,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const { successful, failed } = response.data.data;
        
        // Update the generations state with new scores
        setGenerations((prev) =>
          prev.map((gen) =>
            selectedGenerations.has(gen.id) && response.data.data.results.find((r: any) => r.id === gen.id && r.success)
              ? { ...gen, aestheticScore: pendingBulkScore }
              : gen
          )
        );

        // Clear selection
        setSelectedGenerations(new Set());

        if (successful > 0) {
          showSnackbar(`Successfully updated ${successful} generation${successful > 1 ? 's' : ''} to ${pendingBulkScore}`, 'success');
        }
        if (failed > 0) {
          showSnackbar(`${failed} generation${failed > 1 ? 's' : ''} failed to update`, 'warning');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to bulk update scores';
      showSnackbar(errorMessage, 'error');
    } finally {
      setBulkUpdating(false);
      setPendingBulkScore(null);
    }
  };

  const getMediaAsset = (generation: Generation) => {
    if (generation.images && generation.images.length > 0) {
      const img = generation.images[0];
      return {
        type: 'image' as const,
        url: img.avifUrl || img.thumbUrl || img.url,
        originalUrl: img.url,
      };
    }
    if (generation.videos && generation.videos.length > 0) {
      const vid = generation.videos[0];
      return {
        type: 'video' as const,
        url: vid.url,
        poster: vid.thumbUrl || undefined,
      };
    }
    return null;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && generations.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              ArtStation Scoring
            </Typography>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} variant="outlined" size="small">
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={240} />
                  <CardContent>
                    <Skeleton height={24} width="80%" sx={{ mb: 1 }} />
                    <Skeleton height={20} width="40%" sx={{ mb: 2 }} />
                    <Skeleton height={36} />
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
            ArtStation Scoring
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
        <Paper
          elevation={2}
          sx={{
            p: { xs: 2, sm: 3 },
            mb: { xs: 2, sm: 3, md: 4 },
            bgcolor: 'info.light',
            borderLeft: 4,
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Instructions
          </Typography>
          <Typography variant="body2" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '0.9rem' } }}>
            Review each generation and assign a score between 9.0 and 10.0 for ArtStation inclusion.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '0.9rem' } }}>
            Only generations with scores 9-10 will appear in the ArtStation public feed.
          </Typography>
        </Paper>

        <ArtStationFiltersComponent
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            // Reset pagination when filters change
            setNextCursor(null);
            setHasMore(true);
            setSelectedGenerations(new Set()); // Clear selection on filter change
          }}
          onReset={() => {
            setFilters({});
            setNextCursor(null);
            setHasMore(true);
            setSelectedGenerations(new Set()); // Clear selection on reset
          }}
          availableModels={availableModels}
          availableUsers={availableUsers}
        />

        {/* Bulk Selection and Scoring Controls */}
        {generations.length > 0 && (
          <Paper
            elevation={2}
            sx={{
              p: 2,
              mb: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedGenerations.size === generations.length && generations.length > 0}
                  indeterminate={selectedGenerations.size > 0 && selectedGenerations.size < generations.length}
                  onChange={handleSelectAll}
                  disabled={generations.length === 0 || bulkUpdating}
                />
              }
              label={
                selectedGenerations.size === generations.length && generations.length > 0
                  ? 'Deselect All'
                  : 'Select All'
              }
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                {selectedGenerations.size} selected
              </Typography>
              <ButtonGroup
                variant="outlined"
                size="small"
                disabled={selectedGenerations.size === 0 || bulkUpdating}
              >
                <Button
                  onClick={() => handleBulkScoreClick(9.0)}
                  disabled={selectedGenerations.size === 0 || bulkUpdating}
                >
                  {bulkUpdating ? <CircularProgress size={16} /> : 'Bulk 9.0'}
                </Button>
                <Button
                  onClick={() => handleBulkScoreClick(9.5)}
                  disabled={selectedGenerations.size === 0 || bulkUpdating}
                >
                  {bulkUpdating ? <CircularProgress size={16} /> : 'Bulk 9.5'}
                </Button>
                <Button
                  onClick={() => handleBulkScoreClick(10.0)}
                  disabled={selectedGenerations.size === 0 || bulkUpdating}
                >
                  {bulkUpdating ? <CircularProgress size={16} /> : 'Bulk 10.0'}
                </Button>
              </ButtonGroup>
            </Box>
          </Paper>
        )}

        {generations.length === 0 && !loading ? (
          <Box
            sx={{
              textAlign: 'center',
              py: { xs: 6, sm: 8 },
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">No generations found</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              All public generations have been processed or there are no public items available.
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
              {generations.map((generation) => {
                const media = getMediaAsset(generation);
                const isUpdating = updating === generation.id;
                const currentScore = generation.aestheticScore;

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={generation.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        },
                        border: selectedGenerations.has(generation.id) ? '2px solid' : '1px solid',
                        borderColor: selectedGenerations.has(generation.id) ? 'primary.main' : 'divider',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <Checkbox
                          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
                          checked={selectedGenerations.has(generation.id)}
                          onChange={(e) => handleSelectGeneration(generation.id, e.target.checked)}
                          disabled={bulkUpdating || updating === generation.id}
                        />
                        {media ? (
                        media.type === 'video' ? (
                          <CardMedia
                            component="video"
                            controls
                            poster={media.poster}
                            height="240"
                            src={media.url}
                            preload="metadata"
                            sx={{
                              objectFit: 'cover',
                              width: '100%',
                              bgcolor: 'grey.200',
                            }}
                          />
                        ) : (
                          <CardMedia
                            component="img"
                            height="240"
                            image={media.url}
                            alt={generation.prompt || 'Generation'}
                            sx={{
                              objectFit: 'cover',
                              width: '100%',
                              bgcolor: 'grey.200',
                            }}
                          />
                        )
                      ) : (
                        <Box
                          sx={{
                            height: 240,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.200',
                          }}
                        >
                          <ImageNotSupportedIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                        </Box>
                      )}
                      </Box>

                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            mb: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            lineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          }}
                        >
                          {generation.prompt || 'No prompt'}
                        </Typography>
                        <Chip
                          label={generation.generationType}
                          size="small"
                          sx={{ mb: 2, textTransform: 'capitalize', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                          color="default"
                          variant="outlined"
                        />

                        <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                          >
                            Score: {currentScore?.toFixed(1) || 'Not scored'}
                          </Typography>
                          <ButtonGroup
                            fullWidth
                            variant="outlined"
                            size="small"
                            disabled={isUpdating}
                            sx={{ '& .MuiButton-root': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
                          >
                            <Button
                              onClick={() => handleScoreChange(generation.id, 9.0)}
                              variant={currentScore === 9.0 ? 'contained' : 'outlined'}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <CircularProgress size={14} /> : '9.0'}
                            </Button>
                            <Button
                              onClick={() => handleScoreChange(generation.id, 9.5)}
                              variant={currentScore === 9.5 ? 'contained' : 'outlined'}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <CircularProgress size={14} /> : '9.5'}
                            </Button>
                            <Button
                              onClick={() => handleScoreChange(generation.id, 10.0)}
                              variant={currentScore === 10.0 ? 'contained' : 'outlined'}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <CircularProgress size={14} /> : '10.0'}
                            </Button>
                          </ButtonGroup>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Infinite scroll trigger */}
            <Box ref={observerTarget} sx={{ py: 4, textAlign: 'center' }}>
              {loadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Loading more...
                  </Typography>
                </Box>
              )}
              {!hasMore && generations.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  All generations loaded
                </Typography>
              )}
            </Box>
          </>
        )}
      </Container>

      {/* Bulk Score Confirmation Dialog */}
      <Dialog
        open={bulkScoreDialogOpen}
        onClose={() => setBulkScoreDialogOpen(false)}
        aria-labelledby="bulk-score-dialog-title"
        aria-describedby="bulk-score-dialog-description"
      >
        <DialogTitle id="bulk-score-dialog-title">Confirm Bulk Score Update</DialogTitle>
        <DialogContent>
          <DialogContentText id="bulk-score-dialog-description">
            Are you sure you want to update {selectedGenerations.size} selected generation{selectedGenerations.size > 1 ? 's' : ''} to a score of {pendingBulkScore}?
            This action will set their aesthetic score and make them appear in the ArtStation feed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkScoreDialogOpen(false)} disabled={bulkUpdating}>
            Cancel
          </Button>
          <Button onClick={handleBulkScoreConfirm} color="primary" variant="contained" disabled={bulkUpdating} autoFocus>
            {bulkUpdating ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
