/**
 * PayWay TypeScript SDK
 * An unofficial TypeScript client for ABA PayWay payment gateway
 * 
 * This SDK builds request payloads with HMAC-SHA512 signatures.
 * It does NOT make HTTP requests directly.
 * 
 * @packageDocumentation
 */

export { PayWayClient } from "./client.js";
export { trim } from "./utils.js";
export type {
  TransactionStatus,
  PaymentOption,
  ViewType,
  CreateTransactionParams,
  CheckTransactionParams,
  TransactionListParams,
  PayloadBuilderResponse,
  ExecuteOptions,
} from "./types.js";
