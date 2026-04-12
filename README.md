# Canton Confidential Perpetuals

[![CI](https://github.com/your-org/canton-confidential-perps/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/canton-confidential-perps/actions/workflows/ci.yml)

This project implements a GMX-style perpetual futures protocol on the Canton Network. It leverages Canton's unique privacy architecture to provide confidential trading, where position details such as size, leverage, and liquidation price are shielded from public view.

The core logic is written in Daml, a smart contract language designed for multi-party applications, making it ideal for modeling the complex agreements between traders, the protocol, liquidators, and oracles.

## Key Features

*   **Confidential Positions**: Unlike transparent blockchains where all trade details are public, on Canton, a trader's position is a private contract visible only to the trader and the protocol operator. This prevents front-running, targeted liquidations, and data scraping of trader strategies.
*   **Oracle-Driven Mark Price**: The protocol uses a trusted external price oracle to mark positions to market, ensuring fair valuation for calculating profit/loss and triggering liquidations.
*   **Permissioned Liquidation Engine**: A network of authorized liquidators can monitor for under-collateralized positions and trigger liquidations. The privacy model ensures liquidators can confirm a position is liquidatable without seeing the underlying position's size or entry price, protecting trader privacy even during settlement.
*   **Dynamic Funding Rates**: A funding rate mechanism ensures the perpetual's price tracks the underlying index price by creating an incentive for traders to balance long and short open interest.
*   **On-Chain Collateral & Settlement**: All collateral (e.g., stablecoins) is held and managed within Daml smart contracts, guaranteeing atomic settlement of trades and liquidations.

## Privacy Model

Canton's privacy model is "private by default". Data on a contract is only visible to the stakeholders of that contract (e.g., signatories and observers). We leverage this to build our confidential trading environment:

1.  **Margin Account**: When a trader opens an account, a `MarginAccount` contract is created. This contract is only visible to the `Trader` and the `ProtocolOperator`.
2.  **Position Contract**: When a position is opened, a `Position` contract is created. This is also a private contract solely between the `Trader` and `ProtocolOperator`. Observers on the network, other traders, and even liquidators cannot see the details of this contract (size, leverage, entry price).
3.  **Liquidation Privacy**: If a position becomes under-collateralized, the protocol operator creates a `LiquidationOpportunity` contract. This contract is observable by authorized `Liquidator` parties. Crucially, it only exposes the fact that a specific position *is liquidatable* and the required collateral to seize. It **does not** reveal the original size, leverage, or PnL of the position, preserving the trader's privacy. The liquidator simply executes the opportunity, and the protocol handles the settlement atomically and privately.

This stands in stark contrast to public ledgers, where every detail of every trade is broadcast to the entire network.

## Trader Workflow

A typical interaction with the protocol follows these steps:

1.  **Onboard**: The trader allocates a party on the Canton network and requests a `MarginAccount` from the protocol.
2.  **Deposit Collateral**: The trader deposits a supported collateral asset (e.g., a CIP-0056 compliant stablecoin) into their `MarginAccount`.
3.  **Open Position**: The trader submits a request to open a long or short position, specifying the market (e.g., ETH/USD), size, and desired leverage. The protocol creates a private `Position` contract if the trader has sufficient collateral.
4.  **Manage Position**: The trader can add or remove margin from their position at any time to manage their liquidation price.
5.  **Close Position**: The trader can close their position at any time to realize their profit or loss. The PnL is calculated based on the current oracle mark price, and the resulting collateral is returned to their `MarginAccount`.

## Developer Quickstart

### Prerequisites

*   [Git](https://git-scm.com/)
*   [DPM for Canton](https://docs.digitalasset.com/canton/stable/user-manual/dpm/install.html) (SDK 3.4.0 or higher)

```bash
curl https://get.digitalasset.com/install/install.sh | sh
```

### Build and Test

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/canton-confidential-perps.git
    cd canton-confidential-perps
    ```

2.  **Build the Daml model:**
    This command compiles the Daml code into a DAR (Daml Archive).
    ```bash
    dpm build
    ```

3.  **Run the tests:**
    This command runs all the Daml Script tests defined in the `daml/Test` directory.
    ```bash
    dpm test
    ```

### Run Locally

1.  **Start a local Canton ledger:**
    This command starts a single-node Canton network, often called the "sandbox". It exposes a Ledger API on port 6865 (gRPC) and 7575 (JSON API).
    ```bash
    dpm sandbox
    ```

2.  **Run the setup script (in a separate terminal):**
    The setup script initializes the protocol on the sandbox ledger, creating the necessary parties (Operator, Oracle, Liquidator) and setting up the initial market contracts.
    ```bash
    dpm script --dar .daml/dist/canton-confidential-perps-0.1.0.dar --script-name Perps.V1.Test.Setup:setup --ledger-host localhost --ledger-port 6865
    ```

You can now interact with the running ledger via the JSON API or by building a UI.

## Project Structure

```
.
├── daml/
│   ├── Perps/V1/
│   │   ├── Account.daml       # MarginAccount and collateral management
│   │   ├── Engine.daml        # Core trading and liquidation logic
│   │   ├── Market.daml        # Market parameters (fees, margin ratios, etc.)
│   │   ├── Oracle.daml        # Interface for price oracles
│   │   └── Position.daml      # The confidential Position contract
│   ├── Test/
│   │   ├── AccountTest.daml   # Tests for Account logic
│   │   ├── EngineTest.daml    # End-to-end trading and liquidation tests
│   │   └── Setup.daml         # Daml Script for ledger initialization
│   └── daml.yaml              # Daml package configuration
├── .gitignore
└── README.md
```