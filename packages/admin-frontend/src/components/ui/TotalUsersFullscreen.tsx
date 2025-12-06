import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';

interface TotalUsersFullscreenProps {
  open: boolean;
  onClose: () => void;
  initialCount?: number;
}

// Memoized component for the static "Total Users" text to prevent re-renders
const TotalUsersTitle = memo(() => (
  <Typography
    variant="h3"
    component="div"
    sx={{
      fontSize: { xs: '2rem', sm: '3rem', md: '4rem', lg: '5rem' },
      fontWeight: 700,
      mb: { xs: 2, sm: 3 },
      letterSpacing: { xs: 1, sm: 2 },
      textShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    }}
  >
    Total Users
  </Typography>
));

TotalUsersTitle.displayName = 'TotalUsersTitle';

// Memoized component for the count number - only re-renders when count changes
const CountDisplay = memo(({ count }: { count: number }) => {
  const formattedCount = useMemo(() => count.toLocaleString(), [count]);
  
  return (
    <Typography
      variant="h1"
      component="div"
      key={count} // Key prop helps React identify when to update
      sx={{
        fontSize: { xs: '4rem', sm: '6rem', md: '8rem', lg: '10rem' },
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: { xs: 2, sm: 4 },
        textShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      {formattedCount}
    </Typography>
  );
});

CountDisplay.displayName = 'CountDisplay';

export default function TotalUsersFullscreen({ open, onClose, initialCount = 0 }: TotalUsersFullscreenProps) {
  const [count, setCount] = useState<number>(initialCount);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousCountRef = useRef<number>(initialCount);

  // Fetch user count - only update state if count actually changed
  // Using useCallback to memoize the function and avoid dependency issues
  const fetchUserCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/count`, {
        withCredentials: true,
      });

      if (response.data.success) {
        const newCount = response.data.data.total || 0;
        // Only update state if count actually changed
        if (newCount !== previousCountRef.current) {
          previousCountRef.current = newCount;
          setCount(newCount);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user count:', error);
    }
  }, []);

  // Set up real-time polling when dialog opens
  useEffect(() => {
    if (open) {
      // Initialize previous count ref with current count state
      previousCountRef.current = count;
      
      // Fetch immediately
      fetchUserCount();
      
      // Then poll every 3 seconds (similar to YouTube's subscriber count updates)
      // Polling continues in background, but UI only updates when count changes
      intervalRef.current = setInterval(() => {
        fetchUserCount();
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval when dialog closes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchUserCount]);

  // Update count when initialCount changes (from parent)
  useEffect(() => {
    if (initialCount > 0 && count === 0) {
      previousCountRef.current = initialCount;
      setCount(initialCount);
    }
  }, [initialCount]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          m: 0,
          borderRadius: 0,
        },
      }}
    >
      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 24 },
          color: 'primary.contrastText',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.2)',
          },
        }}
        size="large"
      >
        <CloseIcon />
      </IconButton>

      {/* WildMind Logo - Center Top */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 24, sm: 32, md: 40 },
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          zIndex: 1,
        }}
      >
        {/* Icon */}
        <Box
          component="img"
          src="/icons/wildmind_icon_darkbg.svg"
          alt="WildMind Icon"
          sx={{
            width: { xs: 40, sm: 50, md: 60 },
            height: { xs: 40, sm: 50, md: 60 },
            objectFit: 'contain',
          }}
        />
        {/* Text Logo */}
        <Box
          component="img"
          src="/icons/wildmind_text_whitebg.svg"
          alt="WildMind"
          sx={{
            width: { xs: 120, sm: 150, md: 180 },
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 3, sm: 4, md: 6 },
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        {/* Static "Total Users" text - won't re-render */}
        <TotalUsersTitle />

        {/* Count number - only re-renders when count changes */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: '120px', sm: '180px', md: '240px' },
          }}
        >
          <CountDisplay count={count} />
        </Box>

        {/* Static footer text - won't re-render */}
        <Typography
          variant="body2"
          sx={{
            mt: { xs: 3, sm: 4 },
            opacity: 0.7,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            maxWidth: { xs: '90%', sm: '600px' },
          }}
        >
        </Typography>
      </Box>
    </Dialog>
  );
}

