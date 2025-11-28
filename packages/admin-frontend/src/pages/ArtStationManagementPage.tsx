import { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  CircularProgress,
  Paper,
  Chip,
  IconButton,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  ImageNotSupported as ImageNotSupportedIcon,
  Delete as DeleteIcon,
  DeleteOutline as DeleteOutlineIcon,
  PlayArrow as PlayArrowIcon,
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
  createdBy: { uid: string; email?: string; username?: string };
  isPublic?: boolean;
  isDeleted?: boolean;
  visibility?: string;
  model?: string;
  [key: string]: any;
}

interface FilterOptions {
  generationTypes: string[];
  models: string[];
  users: Array<{ uid: string; email?: string; username?: string }>;
}

export default function ArtStationManagementPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ArtStationFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    generationTypes: [],
    models: [],
    users: [],
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchGenerations(true);
  }, [filters]);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/generations/filter-options`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setFilterOptions(response.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch filter options';
      showSnackbar(errorMessage, 'error');
    }
  };

  const fetchGenerations = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setGenerations([]);
        setNextCursor(null);
        setHasMore(true);
        setSelectedItems(new Set());
      } else {
        setLoadingMore(true);
      }

      const params: any = { limit: 20, ...filters };
      if (nextCursor && !reset) {
        params.cursor = nextCursor;
      }

      if (params.dateStart) params.dateStart = new Date(params.dateStart).toISOString();
      if (params.dateEnd) params.dateEnd = new Date(params.dateEnd).toISOString();

      const response = await axios.get(`${API_BASE_URL}/artstation`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        const newGenerations = (response.data.data.generations || [])
          .filter((gen: Generation) => {
            if (gen.isDeleted === true) return false;
            if (gen.isPublic === false || gen.visibility === 'private') return false;
            if (gen.aestheticScore === null || gen.aestheticScore < 9) return false;
            const hasMedia = (gen.images && gen.images.length > 0) || (gen.videos && gen.videos.length > 0);
            return hasMedia;
          });

        setGenerations((prev) => (reset ? newGenerations : [...prev, ...newGenerations]));
        setNextCursor(response.data.data.nextCursor || null);
        setHasMore(response.data.data.hasMore || false);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch ArtStation items';
      if (reset) setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, nextCursor, showSnackbar]);

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
  }, [hasMore, loadingMore, loading, fetchGenerations]);

  const removeFromArtStation = async (generationId: string) => {
    try {
      setRemoving(generationId);
      const response = await axios.delete(
        `${API_BASE_URL}/artstation/${generationId}`,
        { withCredentials: true }
      );
      if (response.data.success) {
        setGenerations((prev) => prev.filter((gen) => gen.id !== generationId));
        setSelectedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(generationId);
          return newSet;
        });
        showSnackbar('Item removed from ArtStation', 'success');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove item';
      showSnackbar(errorMessage, 'error');
    } finally {
      setRemoving(null);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedItems.size === 0) {
      showSnackbar('No items selected', 'warning');
      return;
    }

    try {
      setRemoving('bulk');
      const response = await axios.post(
        `${API_BASE_URL}/artstation/bulk-remove`,
        { bulk: Array.from(selectedItems) },
        { withCredentials: true }
      );
      if (response.data.success) {
        const results = response.data.data.results;
        const successful = results.filter((r: any) => r.success).length;
        const failed = results.filter((r: any) => r.failed).length;

        // Remove successful items from state
        const successfulIds = results.filter((r: any) => r.success).map((r: any) => r.id);
        setGenerations((prev) => prev.filter((gen) => !successfulIds.includes(gen.id)));
        setSelectedItems(new Set());

        if (failed > 0) {
          showSnackbar(`${successful} removed, ${failed} failed`, 'warning');
        } else {
          showSnackbar(`${successful} items removed from ArtStation`, 'success');
        }
        setDeleteDialogOpen(false);
        setBulkDeleteMode(false);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove items';
      showSnackbar(errorMessage, 'error');
    } finally {
      setRemoving(null);
    }
  };

  const toggleSelection = (generationId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(generationId)) {
        newSet.delete(generationId);
      } else {
        newSet.add(generationId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === generations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(generations.map((g) => g.id)));
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

  const handleFiltersChange = (newFilters: ArtStationFilters) => {
    setFilters(newFilters);
  };

  const handleFiltersReset = () => {
    setFilters({});
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
              ArtStation Management
            </Typography>
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} variant="outlined" size="small">
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
            {[...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={i}>
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
            ArtStation Management
          </Typography>
          {generations.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                variant={bulkDeleteMode ? 'contained' : 'outlined'}
                color={bulkDeleteMode ? 'error' : 'inherit'}
                startIcon={<DeleteOutlineIcon />}
                onClick={() => {
                  setBulkDeleteMode(!bulkDeleteMode);
                  if (!bulkDeleteMode) {
                    setSelectedItems(new Set());
                  }
                }}
                size="small"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                {bulkDeleteMode ? 'Cancel' : 'Bulk Remove'}
              </Button>
              {bulkDeleteMode && selectedItems.size > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  size="small"
                  disabled={removing === 'bulk'}
                >
                  Remove {selectedItems.size}
                </Button>
              )}
            </Box>
          )}
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
            ArtStation Management
          </Typography>
          <Typography variant="body2" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '0.9rem' } }}>
            Manage all content currently displayed on ArtStation (items with aesthetic score 9-10).
          </Typography>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '0.9rem' } }}>
            You can remove items from ArtStation by clicking the delete button or using bulk remove mode.
          </Typography>
        </Paper>

        {bulkDeleteMode && generations.length > 0 && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedItems.size === generations.length && generations.length > 0}
                    indeterminate={selectedItems.size > 0 && selectedItems.size < generations.length}
                    onChange={toggleSelectAll}
                  />
                }
                label={`Select All (${selectedItems.size} selected)`}
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={selectedItems.size === 0 || removing === 'bulk'}
              >
                Remove {selectedItems.size} {selectedItems.size === 1 ? 'Item' : 'Items'}
              </Button>
            </Box>
          </Paper>
        )}

        <ArtStationFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
          availableModels={filterOptions.models}
          availableUsers={filterOptions.users}
        />

        {generations.length === 0 && !loading ? (
          <Box
            sx={{
              textAlign: 'center',
              py: { xs: 6, sm: 8 },
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">No ArtStation items found</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              All items have been removed from ArtStation or there are no items matching your filters.
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
              {generations.map((generation) => {
                const media = getMediaAsset(generation);
                const isRemoving = removing === generation.id;
                const isSelected = selectedItems.has(generation.id);

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
                        border: isSelected ? 2 : 0,
                        borderColor: 'error.main',
                      }}
                    >
                      {bulkDeleteMode && (
                        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelection(generation.id)}
                            sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 1 }}
                          />
                        </Box>
                      )}
                      {media ? (
                        media.type === 'video' ? (
                          <Box sx={{ position: 'relative', height: 240, bgcolor: 'grey.200' }}>
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
                                height: '100%',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.3)',
                                pointerEvents: 'none',
                              }}
                            >
                              <PlayArrowIcon sx={{ fontSize: 60, color: 'white' }} />
                            </Box>
                          </Box>
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
                            Score: {generation.aestheticScore?.toFixed(1) || 'N/A'}
                          </Typography>
                          <Tooltip title="Remove from ArtStation">
                            <Button
                              fullWidth
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={isRemoving ? <CircularProgress size={14} /> : <DeleteIcon />}
                              onClick={() => removeFromArtStation(generation.id)}
                              disabled={isRemoving || bulkDeleteMode}
                              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                            >
                              {isRemoving ? 'Removing...' : 'Remove'}
                            </Button>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

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
                  All ArtStation items loaded
                </Typography>
              )}
            </Box>
          </>
        )}
      </Container>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove from ArtStation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} from ArtStation?
            This will set their aesthetic score to null, and they will no longer appear on the public ArtStation feed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={removing === 'bulk'}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkRemove}
            color="error"
            variant="contained"
            disabled={removing === 'bulk'}
            startIcon={removing === 'bulk' ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {removing === 'bulk' ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

