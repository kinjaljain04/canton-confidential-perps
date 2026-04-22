import React from 'react';
import { VscArrowUp, VscArrowDown } from 'react-icons/vsc';

// Assuming the position data is derived from the Daml contract payload.
// Decimals are represented as strings from the ledger.
export interface PositionData {
  contractId: string;
  payload: {
    marketId: string;
    trader: string;
    direction: 'Long' | 'Short';
    size: string;
    collateral: string;
    averageEntryPrice: string;
    liquidationPrice: string;
  };
}

export interface PositionCardProps {
  position: PositionData;
  markPrice: string;
  onClose: (contractId: string) => void;
}

/**
 * A utility function to format numbers as currency, handling potential nulls.
 */
const formatCurrency = (value: number | undefined | null, decimals = 2): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '$ -';
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * A utility function to format percentages.
 */
const formatPercent = (value: number | undefined | null, decimals = 2): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '- %';
  }
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * A reusable component for displaying a single data point.
 */
const DataPoint: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
  <div className={`flex flex-col ${className}`}>
    <span className="text-xs text-gray-400">{label}</span>
    <span className="text-sm font-mono text-gray-200">{value}</span>
  </div>
);

/**
 * Displays an active trading position, including PnL, margin, and liquidation price.
 */
export const PositionCard: React.FC<PositionCardProps> = ({ position, markPrice, onClose }) => {
  const { contractId, payload } = position;
  const { marketId, direction, size, collateral, averageEntryPrice, liquidationPrice } = payload;

  const sizeNum = parseFloat(size);
  const collateralNum = parseFloat(collateral);
  const entryPriceNum = parseFloat(averageEntryPrice);
  const markPriceNum = parseFloat(markPrice);
  const liqPriceNum = parseFloat(liquidationPrice);

  const isLong = direction === 'Long';

  // Calculate Unrealized Profit and Loss (PnL)
  const pnl = isLong
    ? (markPriceNum - entryPriceNum) * sizeNum
    : (entryPriceNum - markPriceNum) * sizeNum;

  const pnlPercentage = collateralNum > 0 ? (pnl / collateralNum) : 0;
  const isProfit = pnl >= 0;

  // Calculate Margin Ratio = Total Equity / Position Notional Value
  const totalEquity = collateralNum + pnl;
  const positionNotional = sizeNum * markPriceNum;
  const marginRatio = positionNotional > 0 ? totalEquity / positionNotional : 0;

  // Calculate Leverage = Position Notional Value (at entry) / Initial Collateral
  const entryNotional = sizeNum * entryPriceNum;
  const leverage = collateralNum > 0 ? entryNotional / collateralNum : 0;

  // For the risk visualization bar, calculate how close the mark price is to the liquidation price.
  const priceRange = Math.abs(entryPriceNum - liqPriceNum);
  const currentDistance = Math.abs(markPriceNum - liqPriceNum);
  const riskFactor = priceRange > 0 ? 1 - (currentDistance / priceRange) : 1; // 100% risk if range is 0
  const riskPercentage = Math.min(Math.max(riskFactor * 100, 0), 100);

  const getRiskBarColor = (percentage: number) => {
    if (percentage > 85) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const pnlColor = isProfit ? 'text-green-400' : 'text-red-400';
  const directionColor = isLong ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300';
  const directionIcon = isLong ? <VscArrowUp /> : <VscArrowDown />;

  const handleClose = () => {
    onClose(contractId);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 backdrop-blur-sm shadow-lg hover:border-blue-500 transition-colors duration-200">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{marketId}</span>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${directionColor}`}>
            {directionIcon}
            {direction.toUpperCase()}
          </span>
          <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {leverage.toFixed(1)}x
          </span>
        </div>
        <button
          onClick={handleClose}
          className="bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors duration-200"
        >
          Close
        </button>
      </div>

      {/* PnL Section */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-400">Unrealized PnL</span>
          <div className={`flex flex-col items-end font-mono ${pnlColor}`}>
            <span className="text-lg">{`${isProfit ? '+' : ''}${formatCurrency(pnl)}`}</span>
            <span className="text-xs">{`(${isProfit ? '+' : ''}${formatPercent(pnlPercentage)})`}</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-700/50">
        <DataPoint label="Size" value={`${sizeNum.toFixed(4)} ${marketId.split('-')[0]}`} />
        <DataPoint label="Collateral" value={formatCurrency(collateralNum)} />
        <DataPoint label="Entry Price" value={formatCurrency(entryPriceNum)} />
        <DataPoint label="Mark Price" value={formatCurrency(markPriceNum)} />
      </div>

      {/* Margin and Liquidation Section */}
      <div className="flex flex-col gap-2 pt-2 border-t border-gray-700/50">
        <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
                <span className="text-xs text-gray-400">Liq. Price</span>
                <span className="font-mono text-red-400">{formatCurrency(liqPriceNum, 2)}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400">Margin Ratio</span>
                <span className="font-mono text-gray-200">{formatPercent(marginRatio)}</span>
            </div>
        </div>
        {/* Liquidation Risk Bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1" title={`Liquidation risk: ${riskPercentage.toFixed(0)}%`}>
          <div
            className={`${getRiskBarColor(riskPercentage)} rounded-full h-1.5 transition-all duration-300`}
            style={{ width: `${riskPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};