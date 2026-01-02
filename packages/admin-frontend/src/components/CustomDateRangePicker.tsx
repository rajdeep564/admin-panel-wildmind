import React, { useState } from 'react';
import { TextField, Button, Stack } from '@mui/material';

interface CustomDateRangePickerProps {
  onApply: (dates: { startDate: string; endDate: string }) => void;
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ onApply }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ startDate, endDate });
    }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <TextField
        type="date"
        label="Start Date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
        sx={{ width: 180 }}
      />
      <TextField
        type="date"
        label="End Date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
        sx={{ width: 180 }}
      />
      <Button
        variant="contained"
        onClick={handleApply}
        disabled={!startDate || !endDate}
        size="small"
      >
        Apply
      </Button>
    </Stack>
  );
};

export default CustomDateRangePicker;
