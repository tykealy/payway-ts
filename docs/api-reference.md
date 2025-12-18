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
| `buildTransactionListPayload()` | Build transaction list query | `PayloadBuilderResponse` |
| `buildCompletePreAuthPayload()` | Build pre-auth completion | `PayloadBuilderResponse` |
| `buildCompletePreAuthWithPayoutPayload()` | Build pre-auth completion with payout | `PayloadBuilderResponse` |
| `buildCancelPreAuthPayload()` | Build pre-auth cancellation | `PayloadBuilderResponse` |
| `execute()` | Execute a payload (server-to-server) | `Promise<any>` |
| `create_hash()` | Generate HMAC-SHA512 hash | `string` |

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
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_date` | string | No | Start date (yyyyMMddHHmmss) |
| `to_date` | string | No | End date (yyyyMMddHHmmss) |
| `from_amount` | number \| string | No | Minimum amount filter |
| `to_amount` | number \| string | No | Maximum amount filter |
| `status` | TransactionStatus | No | Status filter (e.g., "APPROVED") |

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
  from_date: "20240101000000",
  to_date: "20240131235959",
  status: "APPROVED"
});

const transactions = await client.execute(payload);
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
  PayWayAPIError
} from 'payway-ts';
```

### PayloadBuilderResponse

```typescript
interface PayloadBuilderResponse {
  fields: Record<string, string>;
  hash: string;
  url: string;
  method: "POST";
}
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
- [Review security best practices](security.md)
- [See integration examples](client-side-form-submission.md)
