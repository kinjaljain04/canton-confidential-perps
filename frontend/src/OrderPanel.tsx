import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Tabs,
  Tab,
  Slider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useParty } from '@c7/react';
// Assuming a custom hook to get the perps client instance
// This would be defined elsewhere in the project, likely wrapping the perpsClient.ts SDK
import { usePerpsClient } from '../hooks/usePerpsClient';

// --- Styled Components ---

const OrderPanelContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  minWidth: 380,
}));

const OrderTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
  },
}));

const LongTab = styled(Tab)({
  '&.Mui-selected': {
    color: '#26a69a', // Green for long
  },
});

const ShortTab = styled(Tab)({
  '&.Mui-selected': {
    color: '#ef5350', // Red for short
  },
});

const InfoRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  fontSize: '0.875rem',
});

// --- Component Props ---

interface OrderPanelProps {
  marketId: string;
  markPrice: number;
  baseAsset: string; // e.g., "ETH"
  quoteAsset: string; // e.g., "USDC"
  maintenanceMarginRate: number; // e.g., 0.05 for 5%
  openFeeRate: number; // e.g., 0.001 for 0.1%
}

// --- Helper Functions ---

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number, maximumFractionDigits = 4) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
};


// --- Main Component ---

export const OrderPanel: React.FC<OrderPanelProps> = ({
  marketId,
  markPrice,
  baseAsset,
  quoteAsset,
  maintenanceMarginRate,
  openFeeRate,
}) => {
  const { party } = useParty();
  const perpsClient = usePerpsClient();

  const [orderType, setOrderType] = useState<'Long' | 'Short'>('Long');
  const [payAmount, setPayAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrderTypeChange = (_event: React.SyntheticEvent, newValue: 'Long' | 'Short'>) => {
    setOrderType(newValue);
  };

  const collateralValue = useMemo(() => parseFloat(payAmount) || 0, [payAmount]);

  const positionValue = useMemo(() => {
    return collateralValue * leverage;
  }, [collateralValue, leverage]);

  const positionSize = useMemo(() => {
    if (markPrice === 0) return 0;
    return positionValue / markPrice;
  }, [positionValue, markPrice]);

  const liquidationPrice = useMemo(() => {
    if (leverage <= 1) return 0; // No liquidation for 1x leverage or less

    // For a long position, liquidation occurs when the price drops.
    // Liq Price = Entry Price * (1 - (Initial Margin % - Maintenance Margin %))
    // Initial Margin % is 1 / Leverage.
    // Liq Price = Entry Price * (1 - (1 / Leverage - Maintenance Margin Rate))
    const initialMargin = 1 / leverage;
    if (initialMargin <= maintenanceMarginRate) {
      return orderType === 'Long' ? 0 : Infinity; // Cannot be liquidated on open
    }
    
    const marginDiff = initialMargin - maintenanceMarginRate;

    if (orderType === 'Long') {
      return markPrice * (1 - marginDiff);
    } else {
      return markPrice * (1 + marginDiff);
    }
  }, [leverage, markPrice, orderType, maintenanceMarginRate]);

  const openFee = useMemo(() => {
    return positionValue * openFeeRate;
  }, [positionValue, openFeeRate]);

  const handleSubmit = useCallback(async () => {
    if (!party || !perpsClient || collateralValue <= 0) {
      setError("Invalid parameters. Check collateral amount and wallet connection.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const isLong = orderType === 'Long';
      // The perpsClient SDK would handle converting these JS numbers
      // to Daml Decimals as required by the contract.
      await perpsClient.openPosition({
        marketId,
        trader: party,
        isLong,
        collateral: collateralValue,
        leverage: leverage,
      });
      // Reset form on success
      setPayAmount('');
      setLeverage(2);
    } catch (err) {
      console.error("Failed to open position:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [party, perpsClient, collateralValue, leverage, orderType, marketId]);

  const isSubmitDisabled = !party || isSubmitting || collateralValue <= 0;

  return (
    <OrderPanelContainer>
      <Typography variant="h6" gutterBottom>
        Trade {baseAsset}/{quoteAsset}
      </Typography>
      <OrderTabs value={orderType} onChange={handleOrderTypeChange} variant="fullWidth">
        <LongTab label="Long" value="Long" />
        <ShortTab label="Short" value="Short" />
      </OrderTabs>

      <TextField
        fullWidth
        label={`Pay (${quoteAsset})`}
        variant="outlined"
        type="number"
        value={payAmount}
        onChange={(e) => setPayAmount(e.target.value)}
        margin="normal"
        InputProps={{
          inputProps: { min: 0 }
        }}
      />

      <Box sx={{ mt: 2, mb: 1, px: 1 }}>
        <Typography gutterBottom>Leverage</Typography>
        <Slider
          value={leverage}
          onChange={(_e, newValue) => setLeverage(newValue as number)}
          aria-labelledby="leverage-slider"
          valueLabelDisplay="auto"
          step={0.1}
          marks={[
            { value: 1.1, label: '1.1x' },
            { value: 10, label: '10x' },
            { value: 25, label: '25x' },
            { value: 50, label: '50x' },
          ]}
          min={1.1}
          max={50}
        />
      </Box>

      <Box sx={{ p: 2, mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <InfoRow>
          <Typography color="text.secondary">Collateral</Typography>
          <Typography>{formatCurrency(collateralValue, quoteAsset)}</Typography>
        </InfoRow>
        <InfoRow>
          <Typography color="text.secondary">Leverage</Typography>
          <Typography>{leverage.toFixed(2)}x</Typography>
        </InfoRow>
        <InfoRow>
          <Typography color="text.secondary">Position Size</Typography>
          <Typography>
            {formatNumber(positionSize)} {baseAsset} ({formatCurrency(positionValue, quoteAsset)})
          </Typography>
        </InfoRow>
        <InfoRow>
          <Typography color="text.secondary">Entry Price</Typography>
          <Typography>{formatCurrency(markPrice, quoteAsset)}</Typography>
        </InfoRow>
        <InfoRow>
          <Typography color="text.secondary">
            Liq. Price (Est.)
            <Tooltip title="This is an estimated price. The actual liquidation price may vary due to funding rates and price volatility.">
              <InfoOutlinedIcon sx={{ fontSize: '1rem', ml: 0.5, verticalAlign: 'middle', cursor: 'pointer' }} />
            </Tooltip>
          </Typography>
          <Typography>
            {liquidationPrice > 0 && liquidationPrice !== Infinity 
              ? formatCurrency(liquidationPrice, quoteAsset) 
              : 'N/A'}
          </Typography>
        </InfoRow>
        <InfoRow>
          <Typography color="text.secondary">Fees (Est.)</Typography>
          <Typography>{formatCurrency(openFee, quoteAsset)}</Typography>
        </InfoRow>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Button
        fullWidth
        variant="contained"
        color={orderType === 'Long' ? 'success' : 'error'}
        sx={{ mt: 3, py: 1.5, textTransform: 'none', fontSize: '1rem' }}
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
      >
        {isSubmitting ? (
          <CircularProgress size={24} color="inherit" />
        ) : !party ? (
          'Connect Wallet'
        ) : (
          `Open ${orderType} Position`
        )}
      </Button>
    </OrderPanelContainer>
  );
};