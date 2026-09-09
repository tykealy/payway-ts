import { createHash, encryptWithRSA } from "../crypto.js";
import { formatRequestTime } from "../utils.js";
import type {
  PayWayConfig,
  CompletePreAuthParams,
  CompletePreAuthWithPayoutParams,
  CancelPreAuthParams,
  PayloadBuilderResponse,
} from "../types.js";

/**
 * Pre-authorization completion and cancellation payload builders.
 *
 * All three endpoints share one shape: sensitive data is RSA encrypted into
 * `merchant_auth`. The hash order is NOT shared — completion and cancellation
 * concatenate the same three values differently, confirmed against the live
 * API: sending either order to the other endpoint returns "Invalid hash".
 *
 * @packageDocumentation
 */

/**
 * Builds a pre-auth payload
 *
 * @param config - Merchant credentials
 * @param dataToEncrypt - Object to encrypt into merchant_auth
 * @param path - API path relative to base_url
 * @returns Payload with fields, hash, and URL
 */
type PreAuthHashOrder = "completion" | "cancellation";

function buildPreAuthPayload(
  config: PayWayConfig,
  dataToEncrypt: Record<string, any>,
  path: string,
  hashOrder: PreAuthHashOrder,
): PayloadBuilderResponse {
  // Encrypt the data with RSA public key
  const merchant_auth = encryptWithRSA(config.rsa_public_key, dataToEncrypt);

  // Create request time
  const request_time = formatRequestTime(new Date());

  // Completion and cancellation genuinely differ here; both orders are verified
  // against the live API.
  const hash = createHash(
    config.api_key,
    hashOrder === "cancellation"
      ? [config.merchant_id, merchant_auth, request_time]
      : [merchant_auth, request_time, config.merchant_id],
  );

  // Build fields
  const fields: Record<string, string> = {
    merchant_auth,
    request_time,
    merchant_id: config.merchant_id,
    hash,
  };

  return {
    fields,
    hash,
    url: `${config.base_url}${path}`,
    method: "POST",
  };
}

/**
 * Builds a complete pre-auth transaction payload
 *
 * @param config - Merchant credentials
 * @param params - Complete pre-auth parameters
 * @returns Payload with fields, hash, and URL
 */
export function buildCompletePreAuthPayload(
  config: PayWayConfig,
  params: CompletePreAuthParams,
): PayloadBuilderResponse {
  const { tran_id, complete_amount } = params;

  return buildPreAuthPayload(
    config,
    {
      mc_id: config.merchant_id,
      tran_id: tran_id,
      complete_amount: complete_amount,
    },
    "api/merchant-portal/merchant-access/online-transaction/pre-auth-completion",
    "completion",
  );
}

/**
 * Builds a complete pre-auth transaction with payout payload
 *
 * @param config - Merchant credentials
 * @param params - Complete pre-auth with payout parameters
 * @returns Payload with fields, hash, and URL
 */
export function buildCompletePreAuthWithPayoutPayload(
  config: PayWayConfig,
  params: CompletePreAuthWithPayoutParams,
): PayloadBuilderResponse {
  const { tran_id, complete_amount, payout } = params;

  return buildPreAuthPayload(
    config,
    {
      mc_id: config.merchant_id,
      tran_id: tran_id,
      complete_amount: complete_amount,
      payout: payout,
    },
    "api/merchant-portal/merchant-access/online-transaction/pre-auth-completion-with-payout",
    "completion",
  );
}

/**
 * Builds a cancel pre-auth transaction payload
 *
 * @param config - Merchant credentials
 * @param params - Cancel pre-auth parameters
 * @returns Payload with fields, hash, and URL
 */
export function buildCancelPreAuthPayload(
  config: PayWayConfig,
  params: CancelPreAuthParams,
): PayloadBuilderResponse {
  const { tran_id } = params;

  return buildPreAuthPayload(
    config,
    {
      mc_id: config.merchant_id,
      tran_id: tran_id,
    },
    "api/merchant-portal/merchant-access/online-transaction/pre-auth-cancellation",
    "cancellation",
  );
}
