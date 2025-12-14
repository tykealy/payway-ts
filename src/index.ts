/**
 * PayWay TypeScript SDK
 * An unofficial TypeScript client for ABA PayWay payment gateway
 * 
 * @packageDocumentation
 */

export { PayWayClient } from "./client.js";
export { trim } from "./utils.js";
export type {
  TransactionStatus,
  PaymentOption,
  CreateTransactionParams,
  CheckTransactionParams,
  TransactionListParams,
  ClientFactory,
  HttpClient,
} from "./types.js";
