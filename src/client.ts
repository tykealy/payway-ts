import { format } from "date-fns";
import { createHmac } from "node:crypto";
import { trim } from "./utils.js";
import type {
  CreateTransactionParams,
  TransactionListParams,
  PayloadBuilderResponse,
  ExecuteOptions,
} from "./types.js";

/**
 * PayWay API Client for ABA PayWay payment gateway
 *
 * This client builds request payloads with HMAC-SHA512 signatures.
 * It does NOT make HTTP requests - you use the returned payload to:
 * 1. Create an HTML form on the client-side, OR
 * 2. Make server-to-server API calls
 *
 * @class PayWayClient
 */
export class PayWayClient {
  public readonly base_url: string;
  public readonly merchant_id: string;
  public readonly api_key: string;

  /**
   * Creates a new PayWayClient instance
   * @param base_url - Base URL of the PayWay API (e.g., https://checkout-sandbox.payway.com.kh/)
   * @param merchant_id - Your merchant ID from ABA Bank
   * @param api_key - Your API key from ABA Bank
   */
  constructor(base_url: string, merchant_id: string, api_key: string) {
    this.base_url = base_url;
    this.merchant_id = merchant_id;
    this.api_key = api_key;
  }

  /**
   * Creates HMAC-SHA512 hash for request signing
   * @param values - Array of strings to hash
   * @returns Base64 encoded hash
   */
  create_hash(values: string[]): string {
    const data = values.join("");
    return createHmac("sha512", this.api_key).update(data).digest("base64");
  }

  /**
   * Creates payload fields with hash signature
   * @param body - Request body parameters
   * @param date - Date for the request (defaults to current date)
   * @returns Plain object with all fields including hash
   * @private
   */
  private create_payload(
    body: Record<string, any> = {},
    date: Date = new Date()
  ): Record<string, string> {
    // Filter out null and undefined values
    body = Object.fromEntries(
      Object.entries(body).filter(([_k, v]) => v != null)
    );

    const req_time = format(date, "yyyyMMddHHmmss");
    const merchant_id = this.merchant_id;

    // Create hash with req_time, merchant_id, and all body values
    const hash = this.create_hash([
      req_time,
      merchant_id,
      ...Object.values(body).map(String),
    ]);

    // Build fields object
    const fields: Record<string, string> = {
      req_time,
      merchant_id,
    };

    // Add all body fields as strings
    for (const [key, value] of Object.entries(body)) {
      fields[key] = String(value);
    }

    // Add hash at the end
    fields.hash = hash;

    return fields;
  }

  /**
   * Builds a payment transaction payload
   *
   * Use this to create a client-side form that submits directly to ABA PayWay.
   * The returned payload contains all fields (including hash) and the URL.
   *
   * @param params - Transaction parameters
   * @returns Payload with fields, hash, and URL for form submission
   *
   * @example
   * ```typescript
   * // Server-side (Next.js API route)
   * const payload = client.buildTransactionPayload({
   *   payment_option: "abapay",
   *   amount: 100,
   *   tran_id: "ORDER-123",
   *   return_url: "https://mysite.com/callback"
   * });
   *
   * // Send to client
   * return Response.json(payload);
   *
   * // Client-side: Create and submit form
   * const form = document.createElement('form');
   * form.method = payload.method;
   * form.action = payload.url;
   * for (const [key, value] of Object.entries(payload.fields)) {
   *   const input = document.createElement('input');
   *   input.type = 'hidden';
   *   input.name = key;
   *   input.value = value;
   *   form.appendChild(input);
   * }
   * document.body.appendChild(form);
   * form.submit();
   * ```
   */
  buildTransactionPayload(
    params: CreateTransactionParams = {}
  ): PayloadBuilderResponse {
    const {
      tran_id,
      payment_option,
      amount,
      currency,
      return_url,
      return_deeplink,
      continue_success_url,
      firstname,
      lastname,
      email,
      phone,
      view_type,
      type,
      lifetime,
      google_play_token,
      items,
      shipping,
      cancel_url,
      skip_success_page,
      custom_fields,
      return_params,
      payment_gate,
      payout,
      additional_params,
    } = params;

    function base64(d: string): string {
      return Buffer.from(d).toString("base64");
    }

    let processedReturnUrl = return_url;
    let processedReturnDeeplink = return_deeplink;
    let processedCancelUrl = cancel_url;
    let processedContinueSuccessUrl = continue_success_url;
    if (typeof continue_success_url === "string") {
      processedContinueSuccessUrl = base64(continue_success_url);
    }

    if (typeof cancel_url === "string") {
      processedCancelUrl = base64(cancel_url);
    }

    if (typeof return_url === "string") {
      processedReturnUrl = base64(return_url);
    }

    if (typeof return_deeplink === "string") {
      processedReturnDeeplink = base64(return_deeplink);
    }

    if (typeof return_deeplink === "object" && return_deeplink != null) {
      processedReturnDeeplink = base64(JSON.stringify(return_deeplink));
    }

    // Build payload fields (order matters for hash generation)
    const fields = this.create_payload({
      tran_id,
      amount,
      items,
      shipping,
      firstname: trim(firstname),
      lastname: trim(lastname),
      email: trim(email),
      phone: trim(phone),
      type,
      payment_option,
      return_url: processedReturnUrl,
      cancel_url: processedCancelUrl,
      continue_success_url: processedContinueSuccessUrl,
      return_deeplink: processedReturnDeeplink,
      currency,
      custom_fields,
      return_params,
      payout,
      lifetime,
      additional_params,
      google_play_token,
      skip_success_page,
    });

    // Add view_type AFTER hash generation (not included in hash)
    if (view_type != null) {
      fields.view_type = view_type;
    }
    if (type != null) {
      fields.type = type;
    }

    return {
      fields,
      hash: fields.hash,
      url: `${this.base_url}api/payment-gateway/v1/payments/purchase`,
      method: "POST",
    };
  }

  /**
   * Builds a check transaction payload
   *
   * Use this for server-to-server API calls to check transaction status.
   *
   * @param tran_id - Transaction ID to check
   * @returns Payload with fields, hash, and URL
   *
   * @example
   * ```typescript
   * const payload = client.buildCheckTransactionPayload("ORDER-123");
   *
   * // Make server-to-server request
   * const formData = new FormData();
   * for (const [key, value] of Object.entries(payload.fields)) {
   *   formData.append(key, value);
   * }
   *
   * const response = await fetch(payload.url, {
   *   method: payload.method,
   *   body: formData
   * });
   * const result = await response.json();
   * ```
   */
  buildCheckTransactionPayload(tran_id: string): PayloadBuilderResponse {
    const fields = this.create_payload({ tran_id });

    return {
      fields,
      hash: fields.hash,
      url: `${this.base_url}api/payment-gateway/v1/payments/check-transaction`,
      method: "POST",
    };
  }

  /**
   * Builds a transaction list payload
   *
   * Use this for server-to-server API calls to retrieve transaction lists.
   *
   * @param params - Filter parameters
   * @returns Payload with fields, hash, and URL
   *
   * @example
   * ```typescript
   * const payload = client.buildTransactionListPayload({
   *   from_date: "20240101000000",
   *   to_date: "20240131235959",
   *   status: "APPROVED"
   * });
   *
   * // Make server-to-server request
   * const formData = new FormData();
   * for (const [key, value] of Object.entries(payload.fields)) {
   *   formData.append(key, value);
   * }
   *
   * const response = await fetch(payload.url, {
   *   method: payload.method,
   *   body: formData
   * });
   * const result = await response.json();
   * ```
   */
  buildTransactionListPayload(
    params: TransactionListParams = {}
  ): PayloadBuilderResponse {
    const { from_date, to_date, from_amount, to_amount, status } = params;

    const fields = this.create_payload({
      from_date,
      to_date,
      from_amount,
      to_amount,
      status,
    });

    return {
      fields,
      hash: fields.hash,
      url: `${this.base_url}api/payment-gateway/v1/payments/transaction-list`,
      method: "POST",
    };
  }

  /**
   * Execute a server-to-server API call
   *
   * This method takes a payload and makes the HTTP request for you.
   * Useful for server-to-server calls like check_transaction and transaction_list.
   *
   * WARNING: For create_transaction with payment_option "abapay", use client-side
   * form submission instead, as it returns HTML. This method will throw an error
   * if you try to execute with payment_option "abapay" (unless allowHtml is true).
   *
   * @param payload - Payload from any build method
   * @param options - Execution options
   * @returns JSON response from ABA PayWay API
   *
   * @throws Error if payment_option is "abapay" and allowHtml is false
   * @throws Error if response is HTML and allowHtml is false
   * @throws Error if HTTP request fails
   *
   * @example
   * ```typescript
   * // Check transaction status (always server-to-server)
   * const result = await client.execute(
   *   client.buildCheckTransactionPayload("ORDER-123")
   * );
   * console.log('Status:', result.status);
   *
   * // Create transaction with cards (server-to-server)
   * const result = await client.execute(
   *   client.buildTransactionPayload({
   *     payment_option: 'cards',
   *     amount: 100,
   *     tran_id: 'ORDER-123'
   *   })
   * );
   *
   * // Get transaction list
   * const transactions = await client.execute(
   *   client.buildTransactionListPayload({ status: 'APPROVED' })
   * );
   * ```
   */
  async execute(
    payload: PayloadBuilderResponse,
    options: ExecuteOptions = {}
  ): Promise<any> {
    const { allowHtml = false } = options;

    // Validation: Prevent accidental abapay server-to-server calls
    if (payload.fields.payment_option === "abapay" && !allowHtml) {
      throw new Error(
        'Cannot execute server-to-server call with payment_option "abapay". ' +
          "ABA PayWay returns HTML for abapay which should be displayed via client-side form submission. " +
          "Use buildTransactionPayload() and create a form in the browser instead. " +
          "If you really need to get the HTML on the server, pass { allowHtml: true }."
      );
    }

    // Build FormData from fields
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload.fields)) {
      formData.append(key, value);
    }

    // Make request to ABA PayWay
    const response = await fetch(payload.url, {
      method: payload.method,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse response based on Content-Type
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Expected: JSON response
      return await response.json();
    } else if (contentType.includes("text/html")) {
      // HTML response (likely abapay or error page)
      if (!allowHtml) {
        throw new Error(
          "Received HTML response but expected JSON. " +
            'This usually means payment_option "abapay" was used, which returns an HTML checkout page. ' +
            "Use client-side form submission for abapay payments. " +
            "If you intentionally want the HTML, pass { allowHtml: true }."
        );
      }
      return await response.text();
    } else {
      // Unknown content type - try JSON first, then text
      try {
        return await response.json();
      } catch {
        if (!allowHtml) {
          throw new Error(
            `Unexpected content-type: ${contentType}. ` +
              "Response is not JSON and allowHtml is false."
          );
        }
        return await response.text();
      }
    }
  }
}
