import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Grid,
  Autocomplete,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

export interface ArtStationFilters {
  generationType?: string | string[];
  model?: string;
  createdBy?: string; // username preferred
  dateStart?: string;
  dateEnd?: string;
  status?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
}

interface ArtStationFiltersProps {
  filters: ArtStationFilters;
  onFiltersChange: (filters: ArtStationFilters) => void;
  onReset: () => void;
  availableModels: string[];
  availableUsers: Array<{ uid: string; email?: string; username?: string }>;
}

const GENERATION_TYPES = [
  { value: 'text-to-image', label: 'Text to Image' },
  { value: 'image-to-image', label: 'Image to Image' },
  { value: 'text-to-video', label: 'Text to Video' },
  { value: 'image-to-video', label: 'Image to Video' },
  { value: 'video-to-video', label: 'Video to Video' },
  { value: 'text-to-music', label: 'Text to Music' },
  { value: 'text-to-speech', label: 'Text to Speech' },
  { value: 'logo', label: 'Logo' },
  { value: 'logo-generation', label: 'Logo Generation' },
  { value: 'sticker-generation', label: 'Sticker Generation' },
  { value: 'product-generation', label: 'Product Generation' },
  { value: 'mockup-generation', label: 'Mockup Generation' },
  { value: 'ad-generation', label: 'Ad Generation' },
  { value: 'text-to-character', label: 'Text to Character' },
  { value: 'image-upscale', label: 'Image Upscale' },
  { value: 'image-edit', label: 'Image Edit' },
  { value: 'image-to-svg', label: 'Image to SVG' },
  { value: 'video-edit', label: 'Video Edit' },
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'generating', label: 'Generating' },
  { value: 'failed', label: 'Failed' },
];

export default function ArtStationFiltersComponent({
  filters,
  onFiltersChange,
  onReset,
  availableModels,
  availableUsers,
}: ArtStationFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ArtStationFilters>(filters);

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  );

  const handleFilterChange = (key: keyof ArtStationFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters: ArtStationFilters = {};
    setLocalFilters(emptyFilters);
    onReset();
  };

  const removeFilter = (key: keyof ArtStationFilters) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <Paper elevation={2} sx={{ mb: 3 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            <Typography variant="h6">Filters</Typography>
            {hasActiveFilters && (
              <Chip
                label={Object.keys(filters).filter((k) => {
                  const v = filters[k as keyof ArtStationFilters];
                  return v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true);
                }).length}
                size="small"
                color="primary"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasActiveFilters && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                startIcon={<ClearIcon />}
              >
                Clear All
              </Button>
            )}
            <IconButton size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Grid container spacing={2}>
              {/* Search */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search Prompt"
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                  placeholder="Search in prompts..."
                  size="small"
                />
              </Grid>

              {/* Generation Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Generation Type</InputLabel>
                  <Select
                    value={Array.isArray(localFilters.generationType) ? localFilters.generationType[0] : (localFilters.generationType || '')}
                    onChange={(e) => handleFilterChange('generationType', e.target.value || undefined)}
                    label="Generation Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {GENERATION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Model */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={localFilters.model || ''}
                    onChange={(e) => handleFilterChange('model', e.target.value || undefined)}
                    label="Model"
                  >
                    <MenuItem value="">All Models</MenuItem>
                    {availableModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={localFilters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* User */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={availableUsers}
                  getOptionLabel={(option) => {
                    // Display username first, fallback to email, then UID
                    if (option.username) return option.username;
                    if (option.email) return option.email;
                    return option.uid;
                  }}
                  value={
                    availableUsers.find(
                      (u) =>
                        u.username === localFilters.createdBy ||
                        u.email === localFilters.createdBy ||
                        u.uid === localFilters.createdBy
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    // Prioritize username, then email, then UID
                    const filterValue = newValue?.username || newValue?.email || newValue?.uid || undefined;
                    handleFilterChange('createdBy', filterValue);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="User (Username/Email)" size="small" placeholder="Search by username or email" />
                  )}
                  size="small"
                />
              </Grid>

              {/* Date Range */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={localFilters.dateStart ? localFilters.dateStart.split('T')[0] : ''}
                  onChange={(e) =>
                    handleFilterChange('dateStart', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={localFilters.dateEnd ? localFilters.dateEnd.split('T')[0] : ''}
                  onChange={(e) =>
                    handleFilterChange('dateEnd', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)
                  }
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              {/* Score Range */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Min Score"
                  type="number"
                  value={localFilters.minScore || ''}
                  onChange={(e) =>
                    handleFilterChange('minScore', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Max Score"
                  type="number"
                  value={localFilters.maxScore || ''}
                  onChange={(e) =>
                    handleFilterChange('maxScore', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  size="small"
                />
              </Grid>
            </Grid>

            {/* Active Filters Chips */}
            {hasActiveFilters && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(filters).map(([key, value]) => {
                  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                    return null;
                  }
                  let label = '';
                  if (key === 'generationType') {
                    const type = GENERATION_TYPES.find((t) => t.value === value);
                    label = `Type: ${type?.label || value}`;
                  } else if (key === 'status') {
                    const status = STATUS_OPTIONS.find((s) => s.value === value);
                    label = `Status: ${status?.label || value}`;
                  } else if (key === 'model') {
                    label = `Model: ${value}`;
                  } else if (key === 'createdBy') {
                    const user = availableUsers.find(
                      (u) => u.username === value || u.email === value || u.uid === value
                    );
                    label = `User: ${user?.username || user?.email || value}`;
                  } else if (key === 'dateStart') {
                    label = `From: ${new Date(value).toLocaleDateString()}`;
                  } else if (key === 'dateEnd') {
                    label = `To: ${new Date(value).toLocaleDateString()}`;
                  } else if (key === 'search') {
                    label = `Search: ${value}`;
                  } else if (key === 'minScore') {
                    label = `Min Score: ${value}`;
                  } else if (key === 'maxScore') {
                    label = `Max Score: ${value}`;
                  }
                  return (
                    <Chip
                      key={key}
                      label={label}
                      onDelete={() => removeFilter(key as keyof ArtStationFilters)}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
  );
}

