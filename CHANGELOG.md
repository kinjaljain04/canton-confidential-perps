# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Funding rate payment mechanism triggered on a periodic basis.
- `RemoveCollateral` choice, allowing traders to withdraw excess margin.
- Integration with CIP-0056 compliant stablecoins for collateral.

### Changed
- Refactored liquidation logic to use a dedicated `LiquidatorRole` for enhanced security and modularity.
- Updated frontend components to use the `@c7/react` library for better performance.

### Fixed
- Corrected rounding issue in profit and loss calculations for small position sizes.

## [0.1.0] - 2024-07-15

### Added
- Initial release of the Canton Confidential Perpetuals protocol.
- Daml models for creating and managing shielded trading positions (`Perps.V1.Position`).
- Core `Position` template with private leverage, collateral, entry price, and liquidation price.
- `Market` template managing oracle prices, funding rates, and protocol fees, controlled by a protocol operator.
- `OpenPosition` choice on the `Market` contract to create a new long or short perpetuals position.
- `ClosePosition` choice on the `Position` contract to settle a position against the current mark price.
- `AddCollateral` choice for traders to top up margin and avoid liquidation.
- Off-ledger liquidation engine documentation (`docs/LIQUIDATION_MODEL.md`) describing how to monitor positions for liquidation without on-chain triggers.
- Daml Script tests covering the full lifecycle: open, add collateral, close, and liquidate.
- Basic React frontend components: `PositionCard.tsx` and `OrderPanel.tsx`.
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) for building and testing the Daml models using DPM.
- Initial trader guide (`docs/TRADER_GUIDE.md`).