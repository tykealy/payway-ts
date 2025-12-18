export type TransactionStatus =
  | "APPROVED"
  | "DECLINED"
  | "PENDING"
  | "PRE-AUTH"
  | "CANCELLED"
  | "REFUNDED"
  | string & {}

export type PaymentOption =
  | "cards"
  | "abapay_khqr"
  | "abapay"
  | "abapay_deeplink"
  | "abapay_khqr_deeplink"
  | "wechat"
  | "alipay"
  |"google_pay"
  | string & {}

export type ViewType =
  | "hosted_view"  // Redirect payer to a new tab
  | "popup"        // Display as bottom sheet on mobile, modal on desktop
  | string & {}

export interface CreateTransactionParams {
  tran_id?: string;
  payment_option?: PaymentOption;
  amount?: number | string;
  currency?: "USD" | "KHR";
  return_url?: string;
  return_deeplink?: string | { android_scheme: string; ios_scheme: string };
  continue_success_url?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  items?: string
  shipping?: number
  cancel_url?: string
  skip_success_page?: number | boolean 
  custom_fields?: string
  return_params?: string
  payment_gate?: number
  payout?: string
  additional_params?: string
  lifetime?: number
  google_play_token?: string
  type?: "purchase" | "pre-auth",
  view_type?: ViewType;
}

export interface CheckTransactionParams {
  tran_id: string;
}

export interface TransactionListParams {
  limit_additional_params?: string
  limit_limit_amount?: number
  limit_limit_currency?: string
  limit_limit_payment_option?: PaymentOption
  limit_limit_view_type?: ViewType
  limit_limit_type?: "purchase" | "pre-auth"
  limit_limit_firstname?: string
  limit_limit_lastname?: string
  from_date?: string;
  to_date?: string;
  from_amount?: string | number;
  to_amount?: string | number;
  status?: TransactionStatus;
}

/**
 * Response from payload builder methods
 * Contains all fields needed to submit a form to PayWay API
 */
export interface PayloadBuilderResponse {
  /**
   * All form fields including hash (ready to iterate and create form inputs)
   */
  fields: Record<string, string>;
  
  /**
   * The HMAC-SHA512 hash signature (also included in fields)
   */
  hash: string;
  
  /**
   * Full URL to submit the form to
   */
  url: string;
  
  /**
   * HTTP method (always "POST" for PayWay)
   */
  method: "POST";
}

/**
 * Options for executing server-to-server API calls
 */
export interface ExecuteOptions {
  /**
   * Allow HTML responses (default: false)
   * 
   * Set to true if you intentionally want to receive HTML responses.
   * Normally, server-to-server calls should only receive JSON.
   * 
   * WARNING: Using payment_option "abapay" returns HTML and should use
   * client-side form submission instead of server-to-server execution.
   */
  allowHtml?: boolean;
}

/**
 * Error thrown when PayWay API request fails
 * 
 * Contains detailed information about the error including
 * HTTP status code and response body from ABA PayWay
 */
export interface PayWayAPIError extends Error {
  /**
   * HTTP status code (e.g., 403, 500)
   */
  status: number;
  
  /**
   * HTTP status text (e.g., "Forbidden", "Internal Server Error")
   */
  statusText: string;
  
  /**
   * Response body from ABA PayWay API
   * Can be JSON object with error details or plain text
   */
  body: any;
}

/**
 * Parameters for completing a pre-auth transaction
 */
export interface CompletePreAuthParams {
  /**
   * Transaction ID of the pre-authorized transaction
   */
  tran_id: string;
  
  /**
   * Amount to complete (required)
   * For card payments: can be up to 10% more than original amount
   */
  complete_amount: number | string;
}

/**
 * Parameters for completing a pre-auth transaction with payout
 */
export interface CompletePreAuthWithPayoutParams {
  /**
   * Transaction ID of the pre-authorized transaction
   */
  tran_id: string;
  
  /**
   * Amount to complete (required)
   * For card payments: can be up to 10% more than original amount
   */
  complete_amount: number | string;
  
  /**
   * Payout details as JSON string
   * Should contain beneficiary and payout information
   */
  payout: string;
}

/**
 * Parameters for canceling a pre-auth transaction
 */
export interface CancelPreAuthParams {
  /**
   * Transaction ID of the pre-authorized transaction to cancel
   */
  tran_id: string;
}

/**
 * Response from pre-auth operations (complete or cancel)
 */
export interface PreAuthResponse {
  /**
   * Final transaction amount (for completed transactions)
   */
  grand_total?: number;
  
  /**
   * Currency code
   */
  currency?: string;
  
  /**
   * Transaction status after the operation
   * - "COMPLETED" for successful completion
   * - "CANCELLED" for successful cancellation
   */
  transaction_status: "COMPLETED" | "CANCELLED" | string;
  
  /**
   * Operation status details
   */
  status: {
    /**
     * Status code (e.g., "00" for success)
     */
    code: string;
    
    /**
     * Human-readable status message
     */
    message: string;
  };
}
