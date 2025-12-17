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
  | "abapay"
  | "abapay_deeplink"
  | "abapay_khqr_deeplink"
  | "wechat"
  | "alipay"
  | "bakong"
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
  pwt?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  /**
   * Defines the view type for the payment page
   * - "hosted_view": Redirect payer to a new tab
   * - "popup": Display as a bottom sheet on mobile web browsers and as a modal popup on desktop web browsers
   * 
   * Note: This field is NOT included in the hash signature
   */
  view_type?: ViewType;
  type?: "purchase" | "pre-auth" | "capture" | "refund" | "void" | "check-transaction" | "transaction-list";
}

export interface CheckTransactionParams {
  tran_id: string;
}

export interface TransactionListParams {
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
