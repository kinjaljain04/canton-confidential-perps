# Canton Confidential Perpetuals: Trader's Guide

Welcome to the trading guide for Canton Confidential Perpetuals. This document provides an overview of the key concepts, trading mechanics, and risk management principles for our platform. Our protocol leverages the unique privacy features of the Canton Network to offer a secure and confidential trading experience.

## 1. Introduction

Canton Confidential Perpetuals is a decentralized derivatives exchange built on Daml and Canton. It allows traders to speculate on the future price of crypto assets using perpetual futures contracts without a fixed expiry date.

**Key Features:**

*   **Privacy by Design:** Your position details—including size, leverage, entry price, and liquidation price—are stored in private Daml contracts visible only to you and the protocol operator. This prevents front-running and MEV strategies common on transparent blockchains.
*   **On-Chain Settlement:** All trades, liquidations, and funding payments are settled atomically on the Canton ledger, ensuring cryptographic certainty and removing counterparty risk.
*   **Oracle-Driven Mark Price:** We use a robust, manipulation-resistant mark price derived from multiple high-quality oracles to determine PnL and trigger liquidations, protecting traders from short-term volatility spikes.

## 2. Core Concepts

### Perpetual Futures
A perpetual future (or "perp") is a derivative contract that mimics a spot market but with added leverage. Unlike traditional futures, it has no expiration date, meaning you can hold a position for as long as you wish.

### Long vs. Short Positions
*   **Long:** You profit if the asset's price goes up.
*   **Short:** You profit if the asset's price goes down.

### Collateral & Leverage
*   **Collateral:** The capital you post to open and maintain a leveraged position. Our protocol primarily uses stablecoins like USDC.
*   **Leverage:** Allows you to open a position much larger than your collateral. For example, with $1,000 in collateral and 10x leverage, you can control a position worth $10,000. Leverage magnifies both potential profits and potential losses.

### Margin
Margin is the collateral required to back your position.
*   **Initial Margin:** The minimum amount of collateral required to *open* a position. It is inversely related to your leverage (e.g., 10x leverage requires 10% initial margin).
*   **Maintenance Margin:** The minimum amount of collateral required to *keep a position open*. If your position's margin falls below this level, it will be liquidated. This is a smaller fraction of your position's value than the initial margin.

### Funding Rate
The funding rate is a mechanism that keeps the perpetual contract's price (the "mark price") in line with the underlying asset's price (the "index price").
*   If the mark price is higher than the index price (perps are trading at a premium), longs pay shorts.
*   If the mark price is lower than the index price (perps are trading at a discount), shorts pay longs.
Funding payments are exchanged between traders periodically (e.g., every 8 hours).

### Liquidation
Liquidation occurs when your losses cause your position's margin to drop below the maintenance margin requirement. At this point, the protocol's liquidation engine automatically closes your position to prevent further losses. The remaining collateral is transferred to the Insurance Fund to cover the system's risk.

**Your liquidation price is the oracle price at which this process is triggered.**

## 3. Trading Walkthrough & Examples

The best way to understand these concepts is through examples. Let's assume the following for our scenarios:
*   **Maintenance Margin Rate:** 5% of position value.

---

### **Example 1: Opening a 10x Long BTC Position**

Alice believes the price of BTC will rise.

*   **Action:** Go LONG on BTC/USD.
*   **Collateral:** 1,000 USDC
*   **Leverage:** 10x
*   **Current BTC Index Price:** $60,000

**Calculations:**

1.  **Position Size (Notional):**
    `Collateral * Leverage = 1,000 * 10 = $10,000`

2.  **Position Size (in BTC):**
    `Position Size / Entry Price = $10,000 / $60,000 = 0.1667 BTC`

3.  **Maintenance Margin Requirement:**
    `Position Size * Maintenance Margin Rate = $10,000 * 5% = $500`

4.  **Available Margin for Losses:**
    This is the buffer Alice has before her position is at risk.
    `Initial Collateral - Maintenance Margin Requirement = $1,000 - $500 = $500`

5.  **Calculating the Liquidation Price:**
    Alice's position will be liquidated if her unrealized losses reach $500. We find the price drop that causes this.
    *   **Loss per $1 Price Drop:** `0.1667 BTC`
    *   **Total Price Drop Until Liquidation:** `$500 / 0.1667 = $3,000`
    *   **Liquidation Price:** `Entry Price - Price Drop = $60,000 - $3,000 = $57,000`

If the mark price of BTC drops to **$57,000**, Alice's position will be liquidated.

---

### **Example 2: Opening a 20x Short ETH Position**

Bob believes the price of ETH will fall.

*   **Action:** Go SHORT on ETH/USD.
*   **Collateral:** 2,000 USDC
*   **Leverage:** 20x
*   **Current ETH Index Price:** $3,500

**Calculations:**

1.  **Position Size (Notional):**
    `Collateral * Leverage = 2,000 * 20 = $40,000`

2.  **Position Size (in ETH):**
    `Position Size / Entry Price = $40,000 / $3,500 = 11.428 ETH`

3.  **Maintenance Margin Requirement:**
    `Position Size * Maintenance Margin Rate = $40,000 * 5% = $2,000`
    *(Note: The maintenance margin requirement is exactly equal to Bob's collateral. This is incorrect. The maintenance margin rate for 20x leverage must be lower than the initial margin rate of 1/20 = 5%. Let's assume a maintenance margin rate of 2.5% for higher leverage.)*

    **Recalculating with a 2.5% Maintenance Margin Rate:**
    `Position Size * Maintenance Margin Rate = $40,000 * 2.5% = $1,000`

4.  **Available Margin for Losses:**
    `Initial Collateral - Maintenance Margin Requirement = $2,000 - $1,000 = $1,000`

5.  **Calculating the Liquidation Price:**
    Bob's position will be liquidated if his unrealized losses (from the price going *up*) reach $1,000.
    *   **Loss per $1 Price Rise:** `11.428 ETH`
    *   **Total Price Rise Until Liquidation:** `$1,000 / 11.428 = $87.50`
    *   **Liquidation Price:** `Entry Price + Price Rise = $3,500 + $87.50 = $3,587.50`

If the mark price of ETH rises to **$3,587.50**, Bob's position will be liquidated.

---

### **Example 3: Managing an Open Position**

Continuing with Alice's long position, the price of BTC drops to $58,000. Her position is now at a loss and closer to her liquidation price of $57,000.

She can **add margin** to protect her position.

*   **Action:** Alice adds 500 USDC to her position's collateral.
*   **New Collateral:** `1,000 (initial) + 500 (added) = 1,500 USDC`
*   **New Available Margin for Losses:** `$1,500 - $500 (MMR) = $1,000`
*   **New Total Price Drop Allowed:** `$1,000 / 0.1667 = $6,000`
*   **New Liquidation Price:** `$60,000 - $6,000 = $54,000`

By adding collateral, Alice has lowered her liquidation price from $57,000 to $54,000, giving her position more breathing room.

## 4. Risk Management

Trading with leverage is inherently risky. Always practice sound risk management.

1.  **Use Leverage Responsibly:** High leverage can lead to rapid liquidations. Start with lower leverage until you are comfortable with the platform's mechanics.
2.  **Monitor Your Margin:** Actively track your margin ratio and liquidation price. Be prepared to add collateral or reduce your position size if the market moves against you.
3.  **Understand Funding:** Be aware of the funding rate, especially if you plan to hold a position for an extended period. A consistently negative funding rate can erode your profits or increase your losses over time.
4.  **Never Risk More Than You Can Afford to Lose:** The volatile nature of crypto markets means that even well-planned trades can result in losses. Your entire margin can be lost in a liquidation event.