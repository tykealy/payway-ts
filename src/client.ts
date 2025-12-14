import { format } from "date-fns";
import { createHmac } from "node:crypto";
import { FormData } from "formdata-node";
import { trim } from "./utils.js";
import type {
  CreateTransactionParams,
  TransactionListParams,
  ClientFactory,
  HttpClient,
} from "./types.js";

/**
 * PayWay API Client for ABA PayWay payment gateway
 * @class PayWayClient
 */
export class PayWayClient {
  public readonly base_url: string;
  public readonly merchant_id: string;
  public readonly api_key: string;
  public _client: HttpClient | any;

  /**
   * Creates a new PayWayClient instance
   * @param base_url - Base URL of the PayWay API (e.g., https://checkout-sandbox.payway.com.kh/)
   * @param merchant_id - Your merchant ID from ABA Bank
   * @param api_key - Your API key from ABA Bank
   * @param client_factory - Optional custom HTTP client factory function
   */
  constructor(
    base_url: string,
    merchant_id: string,
    api_key: string,
    client_factory?: ClientFactory
  ) {
    this.base_url = base_url;
    this.merchant_id = merchant_id;
    this.api_key = api_key;

    if (typeof client_factory === "function") {
      this._client = client_factory(this);
    } else {
      // Create a default fetch-based client similar to axios
      this._client = this.createDefaultClient();
    }
  }

  /**
   * Creates a default HTTP client using native fetch API
   * @private
   */
  private createDefaultClient(): HttpClient {
    const baseURL = this.base_url;
    
    return {
      async post(url: string, data: any) {
        const response = await fetch(`${baseURL}${url}`, {
          method: "POST",
          body: data,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${JSON.stringify(response, null, 2)}`);
        }

        const responseData = await response.json();
        return { data: responseData };
      },
    };
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
   * Creates FormData payload with hash signature
   * @param body - Request body parameters
   * @param date - Date for the request (defaults to current date)
   * @returns FormData object ready to be sent
   */
  create_payload(body: Record<string, any> = {}, date: Date = new Date()): FormData {
    // Filter out null and undefined values
    body = Object.fromEntries(
      Object.entries(body).filter(([_k, v]) => v != null)
    );

    const req_time = format(date, "yyyyMMddHHmmss");
    const merchant_id = this.merchant_id;
    const formData = new FormData();
    const entries = Object.entries(body);

    // Create hash with req_time, merchant_id, and all body values
    const hash = this.create_hash([
      req_time,
      merchant_id,
      ...Object.values(body),
    ]);

    formData.append("req_time", req_time);
    formData.append("merchant_id", merchant_id);

    for (const [key, value] of entries) {
      formData.append(key, value);
    }

    formData.append("hash", hash);
    return formData;
  }

  /**
   * Creates a new payment transaction
   * @param params - Transaction parameters
   * @returns API response data
   */
  async create_transaction(params: CreateTransactionParams = {}): Promise<any> {
    const {
      tran_id,
      payment_option,
      amount,
      currency,
      return_url,
      return_deeplink,
      continue_success_url,
      pwt,
      firstname,
      lastname,
      email,
      phone,
    } = params;

    function base64(d: string): string {
      return Buffer.from(d).toString("base64");
    }

    let processedReturnUrl = return_url;
    let processedReturnDeeplink = return_deeplink;

    if (typeof return_url === "string") {
      processedReturnUrl = base64(return_url);
    }

    if (typeof return_deeplink === "string") {
      processedReturnDeeplink = base64(return_deeplink);
    }

    if (typeof return_deeplink === "object" && return_deeplink != null) {
      processedReturnDeeplink = base64(JSON.stringify(return_deeplink));
    }

    const response = await this._client.post(
      "api/payment-gateway/v1/payments/purchase",
      // Order matters here for hash generation
      this.create_payload({
        tran_id,
        amount,
        pwt,
        firstname: trim(firstname),
        lastname: trim(lastname),
        email: trim(email),
        phone: trim(phone),
        payment_option,
        return_url: processedReturnUrl,
        continue_success_url,
        return_deeplink: processedReturnDeeplink,
        currency,
      })
    );

    return response.data;
  }

  /**
   * Checks the status of a transaction
   * @param tran_id - Transaction ID to check
   * @returns API response data with transaction status
   */
  async check_transaction(tran_id: string): Promise<any> {
    const response = await this._client.post(
      "api/payment-gateway/v1/payments/check-transaction",
      // Order matters here for hash generation
      this.create_payload({ tran_id })
    );
    return response.data;
  }

  /**
   * Retrieves a list of transactions based on filters
   * @param params - Filter parameters
   * @returns API response data with transaction list
   */
  async transaction_list(params: TransactionListParams = {}): Promise<any> {
    const { from_date, to_date, from_amount, to_amount, status } = params;

    const response = await this._client.post(
      "api/payment-gateway/v1/payments/transaction-list",
      this.create_payload({
        from_date,
        to_date,
        from_amount,
        to_amount,
        status,
      })
    );
    return response.data;
  }
}
