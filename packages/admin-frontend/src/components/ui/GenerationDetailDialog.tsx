import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Stack,
  Divider,
  Slider,
  Tooltip,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

type MediaItem = {
  url?: string;
  avifUrl?: string;
  thumbnailUrl?: string;
  thumbUrl?: string;
  originalUrl?: string;
  poster?: string;
  type?: 'image' | 'video';
};

export interface GenerationDetail {
  id: string;
  prompt?: string;
  generationType?: string;
  model?: string;
  status?: string;
  aestheticScore?: number | null;
  images?: Array<MediaItem>;
  videos?: Array<MediaItem>;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: { uid?: string; email?: string; username?: string };
  scoreUpdatedBy?: string;
  scoreUpdatedAt?: any;
  [key: string]: any;
}

interface GenerationDetailDialogProps {
  open: boolean;
  generation: GenerationDetail | null;
  onClose: () => void;
  allowScoreEdit?: boolean;
  onUpdateScore?: (id: string, score: number) => void;
  updating?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  scoreStep?: number;
}

const formatDate = (value: any) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const getMediaAsset = (generation: GenerationDetail | null): MediaItem | null => {
  if (!generation) return null;
  if (generation.images && generation.images.length > 0) {
    const img = generation.images[0];
    if (img && (img.url || img.avifUrl || img.thumbnailUrl || img.thumbUrl)) {
      return {
        type: 'image',
        url: img.avifUrl || img.thumbnailUrl || img.thumbUrl || img.url,
        originalUrl: img.originalUrl || img.url,
      };
    }
  }
  if (generation.videos && generation.videos.length > 0) {
    const vid = generation.videos[0];
    if (vid && vid.url) {
      return {
        type: 'video',
        url: vid.url,
        poster: vid.thumbnailUrl || vid.thumbUrl,
        originalUrl: vid.originalUrl || vid.url,
      };
    }
  }
  return null;
};

export default function GenerationDetailDialog({
  open,
  generation,
  onClose,
  allowScoreEdit = false,
  onUpdateScore,
  updating = false,
  scoreMin = 8,
  scoreMax = 10,
  scoreStep = 0.1,
}: GenerationDetailDialogProps) {
  const [draftScore, setDraftScore] = useState<number>(generation?.aestheticScore ?? scoreMin);

  useEffect(() => {
    if (generation) {
      const next = typeof generation.aestheticScore === 'number' ? generation.aestheticScore : scoreMin;
      setDraftScore(next);
    }
  }, [generation, scoreMin]);

  const media = useMemo(() => getMediaAsset(generation), [generation]);

  const handleScoreCommit = (_: any, value: number | number[]) => {
    if (!generation || !onUpdateScore) return;
    const numericValue = Array.isArray(value) ? value[0] : value;
    setDraftScore(numericValue);
    onUpdateScore(generation.id, numericValue);
  };

  if (!generation) {
    return null;
  }

  const createdByEmail = generation.createdBy?.email;
  const createdByUsername = generation.createdBy?.username;
  const createdByUid = generation.createdBy?.uid;
  const createdByDisplay =
    createdByEmail ||
    createdByUsername ||
    createdByUid ||
    'Unknown user';

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <AppBar position="relative" color="transparent" elevation={0}>
        <Toolbar sx={{ px: 2 }}>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Generation Details
          </Typography>
          <Chip label={`ID: ${generation.id}`} size="small" sx={{ mr: 1 }} />
          {generation.model && <Chip label={generation.model} size="small" sx={{ mr: 1 }} />}
          {generation.generationType && <Chip label={generation.generationType} size="small" color="primary" />}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={7}>
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'grey.900',
                borderRadius: 2,
                overflow: 'hidden',
                height: { xs: '60vh', md: '75vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {media ? (
                media.type === 'video' ? (
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <Box
                      component="video"
                      controls
                      poster={media.poster}
                      src={media.url}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: 'black' }}
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
                        pointerEvents: 'none',
                      }}
                    >
                      <PlayArrowIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.65)' }} />
                    </Box>
                  </Box>
                ) : (
                  <Box
                    component="img"
                    src={media.url}
                    alt={generation.prompt || 'Generation'}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      bgcolor: 'black',
                    }}
                  />
                )
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'grey.500',
                  }}
                >
                  <ImageNotSupportedIcon sx={{ fontSize: 80 }} />
                </Box>
              )}

              {media?.url && (
                <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    endIcon={<OpenInNewIcon />}
                    href={media.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Original
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Typography variant="h6">Details</Typography>
              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Prompt
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {generation.prompt || 'No prompt'}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created By
                </Typography>
                <Typography variant="body2">
                  {createdByDisplay}
                  {createdByUsername && createdByUsername !== createdByDisplay ? ` (${createdByUsername})` : ''}
                </Typography>
                {createdByEmail && createdByEmail !== createdByDisplay && (
                  <Typography variant="caption" color="text.secondary">
                    Email: {createdByEmail}
                  </Typography>
                )}
                {createdByUid && createdByUid !== createdByDisplay && (
                  <Typography variant="caption" color="text.secondary">
                    UID: {createdByUid}
                  </Typography>
                )}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created At
                    </Typography>
                    <Typography variant="body2">{formatDate(generation.createdAt)}</Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Updated At
                    </Typography>
                    <Typography variant="body2">{formatDate(generation.updatedAt)}</Typography>
                  </Stack>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body2">{generation.status || '—'}</Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Model
                    </Typography>
                    <Typography variant="body2">{generation.model || '—'}</Typography>
                  </Stack>
                </Grid>
              </Grid>

              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Score
                </Typography>
                <Typography variant="body2">
                  {typeof generation.aestheticScore === 'number' ? generation.aestheticScore.toFixed(1) : 'Not scored'}
                </Typography>
                {generation.scoreUpdatedBy && (
                  <Typography variant="caption" color="text.secondary">
                    Updated by {generation.scoreUpdatedBy} on {formatDate(generation.scoreUpdatedAt)}
                  </Typography>
                )}
              </Stack>

              {allowScoreEdit && (
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Adjust Score</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {draftScore.toFixed(1)}
                    </Typography>
                  </Box>
                  <Tooltip title="Scores below 9 remove the item from ArtStation">
                    <Slider
                      value={draftScore}
                      min={scoreMin}
                      max={scoreMax}
                      step={scoreStep}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: scoreMin, label: scoreMin.toFixed(1) },
                        { value: 9, label: '9.0' },
                        { value: scoreMax, label: scoreMax.toFixed(1) },
                      ]}
                      onChange={(_, value) => setDraftScore(Array.isArray(value) ? value[0] : value)}
                      onChangeCommitted={handleScoreCommit}
                      disabled={updating}
                    />
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary">
                    Changes save on release.
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                  Generation ID: {generation.id}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Dialog>
  );
}

