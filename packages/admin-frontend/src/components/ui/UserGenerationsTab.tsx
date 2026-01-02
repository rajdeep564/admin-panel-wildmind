import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  TextField, // Restored
  // useTheme, // Removed unused
  // useMediaQuery, // Removed unused
  AppBar,
  Toolbar,
   Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import React from 'react';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  // Visibility as VisibilityIcon, // Removed unused
  // VisibilityOff as VisibilityOffIcon, // Removed unused
  Image as ImageIcon,
  Movie as MovieIcon,
  Audiotrack as AudioIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ArrowForwardIos as ArrowForwardIcon,
  ArrowBackIosNew as ArrowBackIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

// Transition for full-screen dialog
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Generation {
  id: string;
  prompt: string;
  generationType: string;
  model: string;
  status: string;
  isPublic: boolean;
  isDeleted?: boolean;
  aestheticScore?: number;
  createdAt: string;
  images?: Array<{ url?: string, id?: string }>;
  videos?: Array<{ url?: string, id?: string, thumbnailUrl?: string }>;
  audios?: Array<{ url?: string }>;
  [key: string]: any;
}

interface UserGenerationsTabProps {
  userId: string;
}

export default function UserGenerationsTab({ userId }: UserGenerationsTabProps) {
  // const theme = useTheme(); // Removed unused
  // const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Removed unused
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Edit Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generation | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  // Fullscreen View State
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const fetchGenerations = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      
      const currentCursor = reset ? null : cursor;
      const response = await axios.get(`${API_BASE_URL}/users/${userId}/generations`, {
        params: {
          limit: 20,
          cursor: currentCursor,
          sort: 'newest'
        },
        withCredentials: true
      });

      if (response.data.success) {
        const newGens = response.data.data.generations;
        const next = response.data.data.nextCursor;
        const more = response.data.data.hasMore;

        setGenerations(prev => reset ? newGens : [...prev, ...newGens]);
        setCursor(next);
        setHasMore(more);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching user generations:', err);
      setError('Failed to load generations');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchGenerations(true);
  }, [userId]);

  const handleDelete = async (genId: string, fromFullscreen: boolean = false) => {
    if (!window.confirm('Are you sure you want to delete this generation?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/generations/${genId}`, { withCredentials: true });
      
      // Update local state
      setGenerations(prev => prev.filter(g => g.id !== genId));

      if (fromFullscreen && fullscreenIndex !== null) {
        // If we deleted the last item, close fullscreen or move to new last item
        const newCount = generations.length - 1;
        if (newCount <= 0) {
          setFullscreenIndex(null);
        } else if (fullscreenIndex >= newCount) {
          setFullscreenIndex(newCount - 1);
        }
        // Otherwise index stays same (next item shifts into place)
      }
    } catch (err) {
      console.error('Error deleting generation:', err);
      alert('Failed to delete generation');
    }
  };

  const openEditDialog = (gen: Generation, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent opening fullscreen
    setEditingGen(gen);
    setEditPrompt(gen.prompt || '');
    setEditIsPublic(gen.isPublic);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingGen) return;

    try {
      const response = await axios.patch(`${API_BASE_URL}/generations/${editingGen.id}`, {
        prompt: editPrompt,
        isPublic: editIsPublic
      }, { withCredentials: true });

      if (response.data.success) {
        // Update local state
        setGenerations(prev => prev.map(g => 
          g.id === editingGen.id ? { ...g, prompt: editPrompt, isPublic: editIsPublic } : g
        ));
        setEditOpen(false);
      }
    } catch (err) {
      console.error('Error updating generation:', err);
      alert('Failed to update generation');
    }
  };

  const getMediaUrl = (gen: Generation) => {
    if (gen.images && gen.images.length > 0) return gen.images[0].url;
    if (gen.videos && gen.videos.length > 0) return gen.videos[0].thumbnailUrl || gen.videos[0].url;
    if (gen.audios && gen.audios.length > 0) return gen.audios[0].url; // Added for consistency, though not used in preview
    return null;
  };

  const getFullMediaUrl = (gen: Generation) => {
    // For fullscreen, prefer video URL over thumbnail
    if (gen.videos && gen.videos.length > 0) return gen.videos[0].url;
    if (gen.images && gen.images.length > 0) return gen.images[0].url;
    if (gen.audios && gen.audios.length > 0) return gen.audios[0].url;
    return null;
  };

  const getMediaType = (gen: Generation) => {
    const type = (gen.generationType || '').toLowerCase();
    if (type.includes('video')) return 'video';
    if (type.includes('audio') || type.includes('music')) return 'audio';
    return 'image';
  };

  // --- Fullscreen & Navigation Logic ---

  const handleFullscreenOpen = (index: number) => {
    setFullscreenIndex(index);
  };

  const handleFullscreenClose = () => {
    setFullscreenIndex(null);
  };

  const handleNext = useCallback(() => {
    if (fullscreenIndex === null) return;
    if (fullscreenIndex < generations.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    } else if (hasMore) {
        // Option to fetch more if at end? 
        // For now loop back to start or stop
        // setFullscreenIndex(0); // loop
    }
  }, [fullscreenIndex, generations.length, hasMore]);

  const handlePrev = useCallback(() => {
    if (fullscreenIndex === null) return;
    if (fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
  }, [fullscreenIndex]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenIndex === null) return;

      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'Escape':
          handleFullscreenClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIndex, handleNext, handlePrev]);


  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={() => fetchGenerations(true)}>Retry</Button>
      </Box>
    );
  }

  const currentFullscreenGen = fullscreenIndex !== null ? generations[fullscreenIndex] : null;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
         <Typography variant="h6">User Generations ({generations.length}{hasMore ? '+' : ''})</Typography>
         <Button startIcon={<RefreshIcon />} onClick={() => fetchGenerations(true)}>Refresh</Button>
      </Box>

      {generations.length === 0 ? (
        <Typography color="text.secondary" align="center">No generations found for this user.</Typography>
      ) : (
        <Grid container spacing={2}>
          {generations.map((gen, index) => (
            <Grid item xs={12} sm={6} md={4} key={gen.id}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => handleFullscreenOpen(index)}>
                {/* Media Preview */}
                <Box sx={{ height: 180, bgcolor: '#f5f5f5', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getMediaUrl(gen) ? (
                    <CardMedia
                      component={getMediaType(gen) === 'video' ? 'img' : 'img'} 
                      image={getMediaUrl(gen)!}
                      alt={gen.prompt}
                      sx={{ height: '100%', objectFit: 'cover', width: '100%' }}
                    />
                  ) : (
                    <Typography variant="caption">No Preview</Typography>
                  )}
                  
                  {/* Type Icon Overlay */}
                  <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: '50%', p: 0.5, color: 'white' }}>
                    {getMediaType(gen) === 'video' ? <MovieIcon fontSize="small" /> : getMediaType(gen) === 'audio' ? <AudioIcon fontSize="small" /> : <ImageIcon fontSize="small" />}
                  </Box>

                  {/* Public Status Overlay */}
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    {gen.isPublic ? <Chip label="Public" size="small" color="primary" /> : <Chip label="Private" size="small" />}
                  </Box>
                </Box>

                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                    {new Date(gen.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: 40,
                    fontSize: '0.875rem'
                  }}>
                    {gen.prompt || 'No prompt'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }} onClick={(e) => e.stopPropagation()}>
                     <IconButton size="small" onClick={(e) => openEditDialog(gen, e)} title="Edit">
                       <EditIcon fontSize="small" />
                     </IconButton>
                     <IconButton size="small" color="error" onClick={() => handleDelete(gen.id)} title="Delete">
                       <DeleteIcon fontSize="small" />
                     </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Load More */}
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={() => fetchGenerations(false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Generation</DialogTitle>
        <DialogContent>
           <TextField
             autoFocus
             margin="dense"
             label="Prompt"
             type="text"
             fullWidth
             multiline
             rows={3}
             value={editPrompt}
             onChange={(e) => setEditPrompt(e.target.value)}
             sx={{ mb: 2 }}
           />
           <FormControlLabel
             control={
               <Switch
                 checked={editIsPublic}
                 onChange={(e) => setEditIsPublic(e.target.checked)}
               />
             }
             label="Make Public"
           />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen View Dialog */}
      <Dialog
        fullScreen
        open={fullscreenIndex !== null}
        onClose={handleFullscreenClose}
        TransitionComponent={Transition}
        sx={{ bgcolor: 'rgba(0,0,0,0.9)' }}
        PaperProps={{
            sx: { bgcolor: 'black', color: 'white' }
        }}
      >
        <AppBar sx={{ position: 'relative', bgcolor: 'rgba(0,0,0,0.5)' }} elevation={0}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleFullscreenClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div" noWrap>
                {currentFullscreenGen?.prompt || 'Generation View'}
            </Typography>
            
            {currentFullscreenGen && (
                <>
                <Button 
                    autoFocus 
                    color="inherit" 
                    startIcon={<DownloadIcon />} 
                    href={getFullMediaUrl(currentFullscreenGen) || '#'}
                    target="_blank"
                    download
                    sx={{ mr: 2 }}
                >
                    Download
                </Button>
                <Button 
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteIcon />} 
                    onClick={() => handleDelete(currentFullscreenGen.id, true)}
                >
                    Delete
                </Button>
                </>
            )}
          </Toolbar>
        </AppBar>
        
        <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
            p: 2
        }}>
           
            {/* Nav Left */}
            <IconButton 
                onClick={handlePrev}
                disabled={fullscreenIndex === null || fullscreenIndex === 0}
                sx={{ 
                    position: 'absolute', 
                    left: 20, 
                    color: 'white', 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    display: { xs: 'none', md: 'flex' }
                 }}
            >
                <ArrowBackIcon fontSize="large" />
            </IconButton>

            {/* Content */}
            {currentFullscreenGen && (
                <Box sx={{ 
                    maxWidth: '100%', 
                    maxHeight: 'calc(100vh - 80px)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center' 
                }}>
                    {getMediaType(currentFullscreenGen) === 'video' ? (
                        <video 
                            src={getFullMediaUrl(currentFullscreenGen)!} 
                            controls 
                            autoPlay 
                            loop
                            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)', objectFit: 'contain' }}
                        />
                    ) : getMediaType(currentFullscreenGen) === 'audio' ? (
                        <Box sx={{ p: 10, textAlign: 'center' }}>
                            <AudioIcon sx={{ fontSize: 100, mb: 4, color: 'grey.500' }} />
                             <audio 
                                src={getFullMediaUrl(currentFullscreenGen)!} 
                                controls 
                                autoPlay
                                style={{ width: '100%' }}
                            />
                        </Box>
                    ) : (
                        <img 
                            src={getFullMediaUrl(currentFullscreenGen)!} 
                            alt={currentFullscreenGen.prompt} 
                            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)', objectFit: 'contain' }} 
                        />
                    )}
                    
                    {/* Metadata Footer in fullscreen */}
                    <Box sx={{ mt: 2, textAlign: 'center', maxWidth: 800 }}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            ID: {currentFullscreenGen.id} • {new Date(currentFullscreenGen.createdAt).toLocaleString()} • {currentFullscreenGen.model}
                        </Typography>
                    </Box>
                </Box>
            )}

             {/* Nav Right */}
             <IconButton 
                onClick={handleNext}
                disabled={fullscreenIndex === null || fullscreenIndex >= generations.length - 1}
                 sx={{ 
                    position: 'absolute', 
                    right: 20, 
                    color: 'white', 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    display: { xs: 'none', md: 'flex' }
                 }}
            >
                <ArrowForwardIcon fontSize="large" />
            </IconButton>

        </Box>
      </Dialog>

    </Box>
  );
}
