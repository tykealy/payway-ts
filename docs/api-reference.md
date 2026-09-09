# API Reference

Complete reference for all methods, parameters, and types in the payway-ts SDK.

## PayWayClient

### Constructor

```typescript
const client = new PayWayClient(
  base_url: string,       // ABA PayWay API URL
  merchant_id: string,    // Your merchant ID
  api_key: string,        // Your API key
  rsa_public_key?: string // Optional: ABA's RSA public key (required for pre-auth)
)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `base_url` | string | Yes | ABA PayWay API base URL<br/>Sandbox: `https://checkout-sandbox.payway.com.kh/`<br/>Production: `https://checkout.payway.com.kh/` |
| `merchant_id` | string | Yes | Your ABA merchant ID |
| `api_key` | string | Yes | Your ABA API key |
| `rsa_public_key` | string | No | ABA's RSA public key (required for pre-auth operations) |

**Example:**

```typescript
const client = new PayWayClient(
  'https://checkout-sandbox.payway.com.kh/',
  'merchant_123',
  'your-api-key',
  'ABA-RSA-PUBLIC-KEY'  // Optional, needed for pre-auth
);
```

---

## Methods Overview

| Method | Purpose | Returns |
|--------|---------|---------|
| `buildTransactionPayload()` | Build payment transaction | `PayloadBuilderResponse` |
| `buildCheckTransactionPayload()` | Build status check | `PayloadBuilderResponse` |
| `buildCloseTransactionPayload()` | Build close of a pending transaction | `PayloadBuilderResponse` |
| `buildTransactionListPayload()` | Build transaction list query | `PayloadBuilderResponse` |
| `buildCompletePreAuthPayload()` | Build pre-auth completion | `PayloadBuilderResponse` |
| `buildCompletePreAuthWithPayoutPayload()` | Build pre-auth completion with payout | `PayloadBuilderResponse` |
| `buildCancelPreAuthPayload()` | Build pre-auth cancellation | `PayloadBuilderResponse` |
| `buildPayoutPayload()` | Build standalone payout | `PayloadBuilderResponse` |
| `buildAddBeneficiaryPayload()` | Build add beneficiary to whitelist | `PayloadBuilderResponse` |
| `buildUpdateBeneficiaryStatusPayload()` | Build beneficiary enable/disable | `PayloadBuilderResponse` |
| `execute()` | Execute a payload (server-to-server) | `Promise<any>` |
| `create_hash()` | Generate base64 HMAC-SHA512 hash | `string` |
| `create_hash_hex()` | Generate hex HMAC-SHA512 hash (payout only) | `string` |

---

## buildTransactionPayload()

Build a payment transaction payload for client-side form submission or server-to-server execution.

```typescript
buildTransactionPayload(params: CreateTransactionParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface CreateTransactionParams {
  tran_id?: string;
  amount: number | string;
  currency?: "USD" | "KHR";
  payment_option?: PaymentOption;
  return_url?: string;
  return_deeplink?: string | object;
  continue_success_url?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  pwt?: string;
  payout?: PayoutItem[] | string;
  type?: "purchase" | "pre-auth";
  view_type?: "hosted_view" | "popup";
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | Recommended | Unique transaction ID |
| `amount` | number \| string | **Yes** | Transaction amount |
| `currency` | "USD" \| "KHR" | No | Currency code (default: "USD") |
| `payment_option` | PaymentOption | No | Payment method (see below) |
| `return_url` | string | Recommended | Callback URL (auto base64 encoded) |
| `return_deeplink` | string \| object | No | Mobile app deeplink (auto base64 encoded) |
| `continue_success_url` | string | No | Success continuation URL |
| `firstname` | string | No | Customer first name |
| `lastname` | string | No | Customer last name |
| `email` | string | No | Customer email |
| `phone` | string | No | Customer phone |
| `pwt` | string | No | PayWay token |
| `payout` | PayoutItem[] \| string | No | Split & Payout instruction. Arrays are auto base64 encoded; strings pass through. See [Payout](payout.md#step-2b-split--payout). |
| `type` | "purchase" \| "pre-auth" | No | Transaction type (default: "purchase") |
| `view_type` | "hosted_view" \| "popup" | No | Payment page display mode (NOT in hash) |

### Payment Options

```typescript
type PaymentOption =
  | "cards"
  | "abapay"
  | "abapay_deeplink"
  | "abapay_khqr_deeplink"
  | "wechat"
  | "alipay"
  | "bakong";
```

### View Types

- `"hosted_view"` - Opens in new tab/window (default)
- `"popup"` - Modal on desktop, bottom sheet on mobile

**Note:** `view_type` is included in form fields but NOT in the hash signature.

### Return Value

```typescript
interface PayloadBuilderResponse {
  fields: Record<string, string>;
  hash: string;
  url: string;
  method: "POST";
}
```

### Example

```typescript
const payload = client.buildTransactionPayload({
  tran_id: "ORDER-123",
  amount: 100,
  currency: "USD",
  payment_option: "abapay",
  return_url: "https://yoursite.com/callback",
  email: "customer@example.com"
});

// Returns:
{
  fields: {
    req_time: "20241214223000",
    merchant_id: "merchant_123",
    tran_id: "ORDER-123",
    amount: "100",
    currency: "USD",
    payment_option: "abapay",
    return_url: "aHR0cHM...",  // base64
    email: "customer@example.com",
    hash: "abc123..."
  },
  hash: "abc123...",
  url: "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase",
  method: "POST"
}
```

---

## buildCheckTransactionPayload()

Build a payload to check transaction status.

```typescript
buildCheckTransactionPayload(tran_id: string): PayloadBuilderResponse
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Transaction ID to check |

### Example

```typescript
const payload = client.buildCheckTransactionPayload("ORDER-123");

// Use with execute()
const status = await client.execute(payload);
```

---

## buildTransactionListPayload()

Build a payload to retrieve a list of transactions with optional filters.

```typescript
buildTransactionListPayload(params: TransactionListParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface TransactionListParams {
  from_date?: string;
  to_date?: string;
  from_amount?: number | string;
  to_amount?: number | string;
  status?: TransactionStatus;
  page?: number | string;
  pagination?: number | string;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_date` | string | No | Start date (yyyy-MM-dd HH:mm:ss). Defaults to today 00:00:00 |
| `to_date` | string | No | End date (yyyy-MM-dd HH:mm:ss). Defaults to today 23:59:59 |
| `from_amount` | number \| string | No | Minimum amount filter |
| `to_amount` | number \| string | No | Maximum amount filter |
| `status` | TransactionStatus | No | Status filter, comma separated for multiple (e.g., "APPROVED") |
| `page` | number \| string | No | Page index, 1-based. Defaults to 1 |
| `pagination` | number \| string | No | Records per page. Defaults to 40, max 1000 |

The `from_date`–`to_date` range may not exceed 3 days.

### Transaction Status Types

```typescript
type TransactionStatus =
  | "APPROVED"
  | "PENDING"
  | "CANCELLED"
  | "FAILED"
  | "PRE-AUTH"
  | "COMPLETED";
```

### Example

```typescript
const payload = client.buildTransactionListPayload({
  from_date: "2024-01-01 00:00:00",
  to_date: "2024-01-03 23:59:59",
  status: "APPROVED"
});

const transactions = await client.execute(payload);
```

---

## buildCloseTransactionPayload()

Build a payload to close (cancel) a transaction that has not been paid yet.

```typescript
buildCloseTransactionPayload(tran_id: string): PayloadBuilderResponse
```

Once a transaction is closed it no longer accepts payment: ABA PayWay rejects or reverses any incoming payment for that `tran_id`, and sends no callback to your server. Use it to expire holds on limited stock — flash sales, seat reservations, ticketing.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Transaction ID to close (max 20 characters) |

### Returns

`PayloadBuilderResponse` with `contentType: "application/json"` and a `body` object. This is the only transaction endpoint sent as JSON rather than form data — `execute()` handles the difference for you.

### Response Codes

| Code | Meaning |
|------|---------|
| `00` | Success |
| `1` | Wrong hash |
| `5` | Transaction not found |
| `26` | Invalid merchant profile |

### Example

```typescript
const payload = client.buildCloseTransactionPayload("ORDER-123");

const result = await client.execute(payload);
console.log(result.status.code); // "00" on success
```

---

## buildCompletePreAuthPayload()

Build a payload to complete (capture) a pre-authorized transaction.

```typescript
buildCompletePreAuthPayload(params: CompletePreAuthParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface CompletePreAuthParams {
  tran_id: string;
  complete_amount: number | string;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Pre-auth transaction ID |
| `complete_amount` | number \| string | **Yes** | Amount to capture (cards: up to +10% of original) |

### Requirements

- RSA public key must be provided in constructor
- Transaction must be in "PRE-AUTH" status
- Can only complete once

### Example

```typescript
const payload = client.buildCompletePreAuthPayload({
  tran_id: "ORDER-123",
  complete_amount: 110  // +10% allowed for cards
});

const result = await client.execute(payload);
```

---

## buildCompletePreAuthWithPayoutPayload()

Build a payload to complete pre-auth and distribute funds to multiple beneficiaries.

```typescript
buildCompletePreAuthWithPayoutPayload(
  params: CompletePreAuthWithPayoutParams
): PayloadBuilderResponse
```

### Parameters

```typescript
interface PayoutItem {
  acc: string;  // Account number
  amt: number;  // Amount
}

interface CompletePreAuthWithPayoutParams {
  tran_id: string;
  complete_amount: number | string;
  payout: PayoutItem[];  // Array of payout items
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Pre-auth transaction ID |
| `complete_amount` | number \| string | **Yes** | Amount to capture |
| `payout` | `PayoutItem[]` | **Yes** | Array of payout items with `acc` and `amt` |

### Payout Format

```typescript
// Payout array structure
const payout = [
  { acc: "123456", amt: 80 },
  { acc: "789012", amt: 20 }
];
```

### Example

```typescript
const payload = client.buildCompletePreAuthWithPayoutPayload({
  tran_id: "ORDER-123",
  complete_amount: 100,
  payout: [
    { acc: "123456", amt: 80 },
    { acc: "789012", amt: 20 }
  ]
});

const result = await client.execute(payload);
```

---

## buildCancelPreAuthPayload()

Build a payload to cancel a pre-authorized transaction and release funds.

```typescript
buildCancelPreAuthPayload(params: CancelPreAuthParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface CancelPreAuthParams {
  tran_id: string;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Pre-auth transaction ID to cancel |

### Requirements

- RSA public key must be provided in constructor
- Transaction must be in "PRE-AUTH" status
- Cannot cancel already completed/cancelled transactions

### Example

```typescript
const payload = client.buildCancelPreAuthPayload({
  tran_id: "ORDER-123"
});

const result = await client.execute(payload);
console.log(result.transaction_status); // "CANCELLED"
```

---

## buildPayoutPayload()

Build a standalone payout payload. Debits your **settlement account** and credits whitelisted beneficiaries, independent of any customer transaction.

To split the funds of a purchase you are collecting instead, use the `payout` parameter of [`buildTransactionPayload()`](#buildtransactionpayload).

```typescript
buildPayoutPayload(params: PayoutParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface PayoutParams {
  tran_id: string;
  beneficiaries: PayoutBeneficiary[];
  amount: number | string;
  currency: "USD" | "KHR";
  custom_fields?: string | Record<string, unknown>;
}

interface PayoutBeneficiary {
  account: string;
  amount: number;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | **Yes** | Unique payout transaction ID (max 20 characters) |
| `beneficiaries` | PayoutBeneficiary[] | **Yes** | Accounts to credit, maximum 10 per request |
| `amount` | number \| string | **Yes** | Total payout amount, must equal the sum of beneficiary amounts |
| `currency` | "USD" \| "KHR" | **Yes** | Transaction currency |
| `custom_fields` | string \| object | No | Metadata. Objects are JSON encoded. Max 255 characters serialized. |

Note the beneficiary keys are `account` / `amount` here, while the Split & Payout instruction on `buildTransactionPayload()` uses `acc` / `amt`. This mirrors the PayWay API.

### Requirements

- RSA public key must be provided in the constructor
- All beneficiaries must be whitelisted and active, otherwise the payout fails with code `37`
- All beneficiaries must share the transaction currency
- Minimum 0.01 USD or 100 KHR
- Your settlement account must have sufficient balance (code `93`)

### Returns

`PayloadBuilderResponse` with `contentType: "application/json"` and a `body` object holding native types (`amount` stays a number).

### Example

```typescript
const payload = client.buildPayoutPayload({
  tran_id: "PAYOUT-123",
  beneficiaries: [
    { account: "200030000", amount: 1.72 },
    { account: "012538302", amount: 1.72 }
  ],
  amount: 3.44,
  currency: "USD"
});

const result = await client.execute(payload);

if (result.status.code === "0") {
  console.log(result.transaction_id);
  console.log(result.external_reference);
} else {
  // trace_id is what ABA support needs to investigate
  console.error(result.status.code, result.status.message, result.status.trace_id);
}
```

See [Payout: standalone status codes](payout.md#standalone-payout-status-codes) for the full code list. The purchase endpoint returns a [different set of payout codes](payout.md#split--payout-status-codes) — notably `82` means something different on each.

---

## buildAddBeneficiaryPayload()

Build a payload to add a beneficiary to the payout whitelist. Beneficiaries must be whitelisted before they can receive funds through either payout flow, and are **active immediately** once added.

```typescript
buildAddBeneficiaryPayload(params: AddBeneficiaryParams): PayloadBuilderResponse
```

### Parameters

```typescript
interface AddBeneficiaryParams {
  payee: string;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payee` | string | **Yes** | ABA account number or merchant MID |

### Requirements

- RSA public key must be provided in the constructor
- The payee's currency must match your merchant currency (code `PTL147`)

### Example

```typescript
const payload = client.buildAddBeneficiaryPayload({
  payee: "318111358120004"
});

const result = await client.execute(payload);
console.log(result.data.name);     // Outlet name or account holder name
console.log(result.data.type);     // "Merchant" or "ABA Account"
console.log(result.data.status);   // 1 (active)
```

---

## buildUpdateBeneficiaryStatusPayload()

Build a payload to enable or disable a whitelisted beneficiary. Payouts referencing a disabled beneficiary fail with code `37`.

```typescript
buildUpdateBeneficiaryStatusPayload(
  params: UpdateBeneficiaryStatusParams
): PayloadBuilderResponse
```

### Parameters

```typescript
interface UpdateBeneficiaryStatusParams {
  payee: string;
  status: 0 | 1;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payee` | string | **Yes** | ABA account number or merchant MID |
| `status` | 0 \| 1 | **Yes** | `1` to activate, `0` to disable |

### Requirements

- RSA public key must be provided in the constructor
- The payee must already be whitelisted (code `PTL149`)

### Example

```typescript
const payload = client.buildUpdateBeneficiaryStatusPayload({
  payee: "318111358120004",
  status: 0
});

const result = await client.execute(payload);
console.log(result.data.status); // 0 (inactive)
```

---

## execute()

Execute a payload with server-to-server HTTP request to ABA PayWay API.

```typescript
async execute(
  payload: PayloadBuilderResponse,
  options?: ExecuteOptions
): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | PayloadBuilderResponse | **Yes** | Payload from any build method |
| `options` | ExecuteOptions | No | Execution options |

### Execute Options

```typescript
interface ExecuteOptions {
  allowHtml?: boolean;  // Allow HTML responses (default: false)
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowHtml` | boolean | false | Allow HTML responses (for advanced use) |

### Returns

`Promise<any>` - JSON response from ABA PayWay API

### Throws

- Error if `payment_option === "abapay"` without `allowHtml: true`
- Error if response is HTML without `allowHtml: true`
- Error with status code and body if HTTP request fails

### Examples

```typescript
// Check transaction status
const status = await client.execute(
  client.buildCheckTransactionPayload('ORDER-123')
);

// List transactions
const list = await client.execute(
  client.buildTransactionListPayload({ status: 'APPROVED' })
);

// Complete pre-auth
const result = await client.execute(
  client.buildCompletePreAuthPayload({ 
    tran_id: 'ORDER-123',
    complete_amount: 100
  })
);

// Advanced: Allow HTML (not recommended)
const html = await client.execute(
  client.buildTransactionPayload({ payment_option: 'abapay', ... }),
  { allowHtml: true }
);
```

---

## create_hash()

Utility method to create HMAC-SHA512 hash. Used internally by the SDK.

```typescript
create_hash(parts: string[]): string
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parts` | string[] | **Yes** | Array of strings to hash |

### Returns

Base64 encoded HMAC-SHA512 hash

### Example

```typescript
const hash = client.create_hash(['value1', 'value2', 'value3']);
// Returns: "base64-encoded-hash-string"
```

---

## create_hash_hex()

Same HMAC-SHA512 digest as [`create_hash()`](#create_hash), hex encoded instead of base64. Used internally by `buildPayoutPayload()`.

```typescript
create_hash_hex(parts: string[]): string
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parts` | string[] | **Yes** | Array of strings to hash |

### Returns

Lowercase hex encoded HMAC-SHA512 hash (128 characters)

### Why two hash methods

The Payout API is the only PayWay endpoint that expects a hex digest — everything else, including the beneficiary whitelist endpoints, expects base64. The hash inputs differ too:

| Endpoint group | Hash input | Encoding |
|---|---|---|
| Purchase, check, list | `req_time` + `merchant_id` + body values | base64 |
| Pre-auth completion | `merchant_auth` + `request_time` + `merchant_id` | base64 |
| Pre-auth completion with payout | `merchant_auth` + `request_time` + `merchant_id` | base64 |
| Pre-auth cancellation | `merchant_id` + `merchant_auth` + `request_time` | base64 |
| Beneficiary whitelist | `request_time` + `merchant_auth` | base64 |
| Payout | `merchant_id` + `tran_id` + `beneficiaries` + `amount` + `custom_fields` + `currency` | **hex** |

Note the payout hash order is not the request body's field order: `custom_fields` is hashed before `currency` but sent after it, and contributes an empty string when omitted.

### Example

```typescript
const hash = client.create_hash_hex(['value1', 'value2', 'value3']);
// Returns: "128-character-hex-string"
```

---

## TypeScript Types

### Core Types

```typescript
import type {
  PayWayClient,
  CreateTransactionParams,
  PayloadBuilderResponse,
  TransactionListParams,
  CompletePreAuthParams,
  CompletePreAuthWithPayoutParams,
  CancelPreAuthParams,
  ExecuteOptions,
  PaymentOption,
  TransactionStatus,
  PayWayAPIError,
  PayoutItem,
  PayoutBeneficiary,
  PayoutParams,
  PayoutResponse,
  AddBeneficiaryParams,
  UpdateBeneficiaryStatusParams,
  BeneficiaryResponse
} from 'payway-ts';
```

### PayloadBuilderResponse

```typescript
interface PayloadBuilderResponse {
  fields: Record<string, string>;
  hash: string;
  url: string;
  method: "POST";
  body?: Record<string, unknown>;
  contentType?: "multipart/form-data" | "application/json";
}
```

| Field | Description |
|-------|-------------|
| `fields` | All request fields as strings, including `hash`. Use these to build an HTML form. |
| `hash` | The signature, also present in `fields` |
| `url` | Full URL to submit to |
| `method` | Always `"POST"` |
| `body` | Request body with values in native types. Present only for JSON endpoints. |
| `contentType` | Defaults to `"multipart/form-data"` when absent. `"application/json"` for the close transaction, payout and beneficiary whitelist endpoints. |

`execute()` handles both content types for you. If you make the request yourself, send `body` rather than `fields` for JSON endpoints — the payout `amount` must stay a number:

```typescript
await fetch(payload.url, {
  method: payload.method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload.body)
});
```

### PayWayAPIError

```typescript
interface PayWayAPIError extends Error {
  message: string;
  status: number;
  statusText: string;
  body: any;
}
```

---

## Utility Functions

### trim()

Trim whitespace from strings, pass through other types unchanged.

```typescript
import { trim } from 'payway-ts';

trim("  hello  ");  // "hello"
trim(null);          // null
trim(undefined);     // undefined
trim(123);           // 123
```

---

## Next Steps

- [Learn about error handling](error-handling.md)
- [Distribute funds with Payout](payout.md)
- [Review security best practices](security.md)
- [See integration examples](client-side-form-submission.md)
