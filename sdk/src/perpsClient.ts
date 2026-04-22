/**
 * @file This file contains the TypeScript SDK for interacting with the canton-confidential-perps Daml models.
 * It provides a `PerpsClient` class to simplify opening/closing positions, managing margin, and querying market data.
 */

import {
  Ledger,
  Party,
  ExerciseCommand,
  Contract,
} from '@c7/ledger';

/**
 * Represents the side of a trade.
 */
export type Side = "Long" | "Short";

/**
 * Defines the supported markets.
 * In a real-world scenario, this might be fetched from a configuration contract on the ledger.
 */
export type Market = "ETH/USD" | "BTC/USD";

/**
 * Arguments required to open a new perpetuals position.
 */
export interface OpenPositionArgs {
  /** A unique identifier for the position, used for idempotency. */
  positionId: string;
  /** The market for the position (e.g., "ETH/USD"). */
  market: Market;
  /** The side of the trade ("Long" or "Short"). */
  side: Side;
  /** The size of the position in the base asset (e.g., "1.5" for 1.5 ETH). */
  size: string;
  /** The amount of collateral to post for the position, in the quote asset (e.g., USD). */
  collateral: string;
  /** The desired leverage for the position (e.g., "10.0" for 10x). */
  leverage: string;
}

/**
 * Represents the payload of a `Perps.Position.Position` contract.
 */
export interface Position {
  trader: Party;
  protocol: Party;
  market: Market;
  side: Side;
  size: string;
  collateral: string;
  leverage: string;
  entryPrice: string;
  liquidationPrice: string;
  lastFundingRateTimestamp: string; // ISO 8601 timestamp string
  positionId: string;
}

/**
 * Represents the payload of a `Perps.Oracle.Oracle` contract.
 */
export interface Oracle {
    operator: Party;
    market: Market;
    price: string;
    lastUpdated: string; // ISO 8601 timestamp string
}

/**
 * A client for interacting with the Perpetual Protocol Daml contracts.
 */
export class PerpsClient {
  private readonly ledger: Ledger;
  private readonly party: Party;
  private readonly protocolParty: Party;
  private readonly factoryTemplateId: string;
  private readonly positionTemplateId: string;
  private readonly oracleTemplateId: string;

  /**
   * Constructs a new PerpsClient.
   * @param ledger An instance of the `@c7/ledger` Ledger.
   * @param party The party ID of the user acting through the client.
   * @param protocolParty The party ID of the protocol operator.
   * @param mainPackageId The package ID of the deployed perps Daml models.
   */
  constructor(ledger: Ledger, party: Party, protocolParty: Party, mainPackageId: string) {
    this.ledger = ledger;
    this.party = party;
    this.protocolParty = protocolParty;

    // Fully qualified template IDs are constructed from the package ID and module path.
    this.factoryTemplateId = `${mainPackageId}:Perps.Position:PositionFactory`;
    this.positionTemplateId = `${mainPackageId}:Perps.Position:Position`;
    this.oracleTemplateId = `${mainPackageId}:Perps.Oracle:Oracle`;
  }

  /**
   * Opens a new perpetuals position.
   * @param args The parameters for the new position.
   * @throws An error if the protocol's `PositionFactory` contract cannot be found.
   */
  public async openPosition(args: OpenPositionArgs): Promise<void> {
    const factories = await this.ledger.query({ templateId: this.factoryTemplateId, payload: { owner: this.protocolParty } });

    if (factories.length === 0) {
      throw new Error(`No PositionFactory found for protocol party ${this.protocolParty}`);
    }
    const factoryCid = factories[0].contractId;

    const command: ExerciseCommand = {
      templateId: this.factoryTemplateId,
      contractId: factoryCid,
      choice: 'OpenPosition',
      argument: {
        trader: this.party,
        ...args,
      },
    };

    await this.ledger.submitCommands({
      actAs: [this.party],
      commands: [command],
    });
  }

  /**
   * Retrieves the current mark price for a given market.
   * @param market The market to query the price for.
   * @returns The current mark price as a string-encoded decimal.
   * @throws An error if no oracle is found for the specified market.
   */
  public async getMarkPrice(market: Market): Promise<string> {
    const oracles = await this.ledger.query<Oracle>({
        templateId: this.oracleTemplateId,
        payload: { market }
    });

    if (oracles.length === 0) {
        throw new Error(`No oracle found for market ${market}`);
    }

    // Assuming a single, authoritative oracle per market.
    return oracles[0].payload.price;
  }

  /**
   * Lists all active positions for the current user.
   * @returns An array of active position contracts.
   */
  public async listPositions(): Promise<Contract<Position>[]> {
    return await this.ledger.query<Position>({
        templateId: this.positionTemplateId,
        payload: { trader: this.party }
    });
  }

  /**
   * Submits a request to close a position. The protocol must accept the request to finalize closing.
   * @param positionCid The contract ID of the `Position` to close.
   */
  public async requestClosePosition(positionCid: string): Promise<void> {
    const command: ExerciseCommand = {
      templateId: this.positionTemplateId,
      contractId: positionCid,
      choice: 'RequestClose',
      argument: {},
    };

    await this.ledger.submitCommands({
      actAs: [this.party],
      commands: [command],
    });
  }

  /**
   * Deposits additional margin into an existing position.
   * @param positionCid The contract ID of the `Position` to add margin to.
   * @param amount The amount of collateral to deposit.
   */
  public async depositMargin(positionCid: string, amount: string): Promise<void> {
    const command: ExerciseCommand = {
      templateId: this.positionTemplateId,
      contractId: positionCid,
      choice: 'DepositMargin',
      argument: { amount },
    };

    await this.ledger.submitCommands({
      actAs: [this.party],
      commands: [command],
    });
  }

  /**
   * Withdraws margin from an existing position, provided it does not drop below the maintenance margin requirement.
   * @param positionCid The contract ID of the `Position` to withdraw from.
   * @param amount The amount of collateral to withdraw.
   */
  public async withdrawMargin(positionCid: string, amount: string): Promise<void> {
    const command: ExerciseCommand = {
      templateId: this.positionTemplateId,
      contractId: positionCid,
      choice: 'WithdrawMargin',
      argument: { amount },
    };

    await this.ledger.submitCommands({
      actAs: [this.party],
      commands: [command],
    });
  }
}