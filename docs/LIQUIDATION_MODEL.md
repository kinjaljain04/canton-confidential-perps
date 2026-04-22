# Canton Confidential Perpetuals: Liquidation Model

This document outlines the liquidation mechanism for the Canton Confidential Perpetuals protocol. Liquidation is a critical process designed to protect the protocol's solvency by automatically closing positions that have insufficient margin.

## 1. Margin System

The protocol uses a multi-tiered margin system to manage risk.

### Key Concepts

*   **Initial Margin (IM)**: The minimum amount of collateral required to open a position. It is determined by the chosen leverage.
    ```
    Initial Margin = Position Size / Leverage
    ```
*   **Position Margin**: The current value of the collateral backing a position, including unrealized profits and losses (PnL).
    ```
    Position Margin = Initial Margin + Unrealized PnL
    ```
*   **Maintenance Margin (MM)**: The minimum amount of Position Margin required to keep a position open. If the Position Margin falls to or below this level, the position becomes eligible for liquidation.
    ```
    Maintenance Margin = Position Size * Maintenance Margin Fraction (MMF)
    ```

### Margin Fractions

*   **Initial Margin Fraction (IMF)**: The fraction of a position's size required as initial margin. For example, 10x leverage corresponds to an IMF of 10% (0.10).
*   **Maintenance Margin Fraction (MMF)**: The fraction of a position's size required to avoid liquidation. This is a risk parameter set by the protocol. For example, the MMF for ETH-USD might be 1.0%.

The MMF is always lower than the IMF for any given leverage level.

## 2. Liquidation Trigger

A position is flagged for liquidation when its PnL becomes negative enough that the remaining margin is no longer sufficient to maintain it.

**The liquidation condition is:**

```
Position Margin ≤ Maintenance Margin
```

This check is performed by the protocol using the real-time Mark Price provided by a decentralized oracle network.

## 3. Liquidation Price Calculation

The liquidation price is the Mark Price at which a position's margin would fall to the Maintenance Margin level. This price is calculated when a position is opened or modified and is stored confidentially within the `Position` Daml contract.

### Formulas

Let:
- `EntryPrice`: The average entry price of the position.
- `Leverage`: The leverage used for the position.
- `MMF`: The Maintenance Margin Fraction.

**For a LONG position:**

The liquidation price (`LiqPrice`) is calculated as:

```
LiqPrice = EntryPrice * (1 - (1 / Leverage) + MMF)
```

**For a SHORT position:**

The liquidation price (`LiqPrice`) is calculated as:

```
LiqPrice = EntryPrice * (1 + (1 / Leverage) - MMF)
```

## 4. The Liquidation Process

When the Mark Price crosses a position's Liquidation Price, any party with a `Liquidator` role can initiate the liquidation process.

### Step-by-Step Flow

1.  **Identification**: A liquidator's bot monitors the oracle's Mark Price and compares it against potentially liquidatable positions they are authorized to check.
2.  **Initiation**: The liquidator exercises the `Liquidate` choice on the `Position` contract. The Canton protocol atomically verifies the liquidation condition:
    - For longs: `Mark Price <= LiqPrice`
    - For shorts: `Mark Price >= LiqPrice`
3.  **Position Closing**: The position is closed at the current Mark Price.
4.  **Settlement**: The trader's remaining Position Margin is used to cover the liquidation. There are two scenarios:
    *   **Solvent Liquidation (Happy Path)**: If the Position Margin is positive at the time of closure, the liquidator receives the entire remaining margin as a fee. The trader loses all their collateral, but no further funds are required. The Insurance Fund is not used.
    *   **Insolvent Liquidation (Unhappy Path)**: If rapid price movement causes the Position Margin to become negative before the liquidation is executed, the position is "underwater." In this case, the protocol's Insurance Fund is used to cover the deficit (the negative PnL). The liquidator receives a smaller, fixed fee from the Insurance Fund for successfully closing the insolvent position.

## 5. Bankruptcy Price

The Bankruptcy Price is the theoretical price at which a trader's Position Margin becomes exactly zero.

*   **Long Position Bankruptcy Price**: `EntryPrice * (1 - 1/Leverage)`
*   **Short Position Bankruptcy Price**: `EntryPrice * (1 + 1/Leverage)`

If a position is closed at a price worse than its Bankruptcy Price, it results in a socialized loss covered by the Insurance Fund.

## 6. Insurance Fund

The Insurance Fund is a critical safety net for the protocol. Its sole purpose is to cover the losses from insolvent liquidations, ensuring that profitable traders are always paid in full and the protocol itself remains solvent.

The fund is capitalized from:
*   A portion of trading fees.
*   The remaining margin from liquidations that occur at a price better than the bankruptcy price but are not fully claimed by the liquidator.

## 7. Confidentiality on Canton Network

A key advantage of this protocol is its use of Canton's privacy features.

*   **Private Positions**: All details of a position—its size, leverage, entry price, and liquidation price—are stored in a Daml contract visible *only* to the trader and the protocol operator. This information is not broadcast publicly.
*   **Permissioned Liquidation**: Only parties holding a valid `Liquidator` role contract can attempt to liquidate a position. Their query to check if a position is liquidatable is a private transaction.
*   **Prevention of Front-Running**: Because liquidation-worthy positions are not public knowledge, the protocol is shielded from the predatory front-running and MEV (Maximal Extractable Value) strategies common on transparent blockchains. This creates a fairer trading environment.