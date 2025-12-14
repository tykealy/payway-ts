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

export interface ClientFactory {
  (thisRef: any): any;
}

export interface HttpClient {
  post(url: string, data: any): Promise<{ data: any }>;
}
