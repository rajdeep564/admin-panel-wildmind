import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  showCustom?: boolean;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
  value, 
  onChange, 
  showCustom = false 
}) => {
  const ranges = [
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'All Time', value: 'all' }
  ];

  if (showCustom) {
    ranges.push({ label: 'Custom', value: 'custom' });
  }

  return (
    <Box sx={{ mb: 2 }}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, newValue) => {
          if (newValue !== null) {
            onChange(newValue);
          }
        }}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.5,
            fontSize: '0.875rem',
            textTransform: 'none',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              }
            }
          }
        }}
      >
        {ranges.map(range => (
          <ToggleButton key={range.value} value={range.value}>
            {range.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default TimeRangeSelector;
