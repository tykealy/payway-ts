# payway-ts

> TypeScript SDK for ABA PayWay payment integration - Supports both client-side form submission and server-to-server API calls

[![npm version](https://img.shields.io/npm/v/payway-ts.svg)](https://www.npmjs.com/package/payway-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An unofficial, type-safe TypeScript SDK for ABA PayWay payment integration. This SDK provides two integration patterns:

1. **Payload Builder** - Build signed payloads for client-side form submission (recommended for `abapay`)
2. **Server-to-Server** - Execute API calls directly from your server (for other payment options)

> [!WARNING]  
> This is not a product of ABA Bank. This is an unofficial implementation based on https://www.payway.com.kh/developers/

## Two Integration Patterns

### Pattern 1: Client-Side Form Submission (for `abapay`)

Use this when you want the browser to submit directly to ABA PayWay:

```typescript
// Server builds payload → Client creates form → Browser submits to ABA
const payload = client.buildTransactionPayload({ payment_option: 'abapay', ... });
// Send payload to client, client creates and submits HTML form
```

**Use when:**
- Payment option is `abapay` (returns HTML checkout page)
- You want ABA to handle the full checkout UI
- Browser needs to redirect to ABA's payment page

### Pattern 2: Server-to-Server API Call

Use this when you want your server to communicate directly with ABA API:

```typescript
// Server builds and executes in one call
const result = await client.execute(
  client.buildTransactionPayload({ payment_option: 'cards', ... })
);
```

**Use when:**
- Payment option is NOT `abapay` (returns JSON)
- Checking transaction status
- Retrieving transaction lists
- You want to handle responses on the server

## Why Both Patterns?

Different payment flows require different approaches:

1. **`abapay`** - Returns HTML checkout page → Must use client-side form submission
2. **Other payment options** - Return JSON → Can use server-to-server API calls
3. **Flexibility** - Build payloads on server, choose how to execute (client form vs server API call)

## Features

- ✅ **Dual Integration Modes** - Client-side form submission OR server-to-server API calls
- ✅ **Full TypeScript Support** - Complete type definitions with autocomplete
- 🔒 **Server-Side Security** - Build payloads securely on your server (Node.js 18+)
- 🚀 **ES Modules** - Native ESM support
- 🔐 **HMAC-SHA512 Signing** - Automatic request signing with your API key
- 📦 **Minimal Dependencies** - Only `date-fns` for date formatting
- 🎯 **Next.js Ready** - Works seamlessly with Next.js API routes
- ⚡ **Smart Validation** - Prevents common mistakes (e.g., using `abapay` with server-to-server)

## Installation

```bash
npm install payway-ts
```

## Requirements

- Node.js 18.0.0 or higher
- ABA Bank merchant account with API credentials

## Quick Start

### Decision Tree: Which Pattern Should I Use?

```
Is payment_option = "abapay"?
├─ YES → Use Pattern 1 (Client-Side Form)
│         ↳ ABA returns HTML checkout page
│         ↳ Browser must submit form directly
│
└─ NO  → Use Pattern 2 (Server-to-Server)
          ↳ ABA returns JSON response
          ↳ Your server handles the API call
```

### Pattern 1: Client-Side Form Submission

**Best for:** `abapay` payment option

#### Flow Overview

```
1. Server (Next.js API) → Build signed payload using SDK
2. Server → Client → Send payload as JSON
3. Client (Browser) → Create hidden HTML form from payload
4. Client → ABA PayWay → Submit form directly to ABA
5. ABA → Client → ABA handles checkout and redirects back to your return_url
```

#### 1. Server-Side: Build Payload

```typescript
// app/api/payment/create/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  'https://checkout-sandbox.payway.com.kh/',
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function POST(request: Request) {
  const { amount, orderId } = await request.json();
  
  // Build payload with hash signature
  const payload = client.buildTransactionPayload({
    tran_id: orderId,
    amount: amount,
    currency: 'USD',
    payment_option: 'abapay',
    return_url: 'https://yoursite.com/payment/callback',
    view_type: 'popup'  // Optional: 'popup' or 'hosted_view'
  });
  
  // Send to client
  return Response.json(payload);
}
```

### 2. Client-Side: Create and Submit Form

```typescript
'use client';

export default function PaymentButton() {
  const handlePayment = async () => {
    // Get signed payload from your server
    const payload = await fetch('/api/payment/create', {
      method: 'POST',
      body: JSON.stringify({ 
        amount: 100, 
        orderId: `ORDER-${Date.now()}` 
      })
    }).then(r => r.json());
    
    // Create hidden form
    const form = document.createElement('form');
    form.method = payload.method; // "POST"
    form.action = payload.url;     // ABA PayWay URL
    
    // Add all fields as hidden inputs
    for (const [key, value] of Object.entries(payload.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }
    
    // Submit to ABA PayWay
    document.body.appendChild(form);
    form.submit();
  };
  
  return (
    <button onClick={handlePayment}>
      Pay with ABA
    </button>
  );
}
```

  );
}
```

### Pattern 2: Server-to-Server API Call

**Best for:** All payment options except `abapay`, transaction checks, and transaction lists

#### Simple Example

```typescript
// app/api/payment/process/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  'https://checkout-sandbox.payway.com.kh/',
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function POST(request: Request) {
  const { amount, orderId } = await request.json();
  
  try {
    // Build and execute in one step
    const result = await client.execute(
      client.buildTransactionPayload({
        tran_id: orderId,
        amount: amount,
        currency: 'USD',
        payment_option: 'cards',  // NOT 'abapay'
        return_url: 'https://yoursite.com/callback'
      })
    );
    
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Check Transaction Status

```typescript
// Check a transaction
const status = await client.execute(
  client.buildCheckTransactionPayload('ORDER-123')
);

console.log('Transaction status:', status);
```

#### List Transactions

```typescript
// Get transaction list
const transactions = await client.execute(
  client.buildTransactionListPayload({
    from_date: '20240101000000',
    to_date: '20240131235959',
    status: 'APPROVED'
  })
);

console.log('Transactions:', transactions);
```

#### Why Not `abapay`?

The `execute()` method will throw an error if you try to use it with `payment_option: 'abapay'`:

```typescript
// ❌ This will throw an error
await client.execute(
  client.buildTransactionPayload({
    payment_option: 'abapay',  // Error!
    // ...
  })
);
// Error: Cannot execute transactions with payment_option "abapay" from server.
// The "abapay" option returns HTML and must be submitted via client-side form.

// ✅ Use client-side form submission instead (Pattern 1)
```

**Why?** Because `abapay` returns an HTML checkout page, not JSON. Your browser needs to render this page and handle the payment flow.

**Special case:** If you really need to handle HTML responses on the server (advanced use case), you can override this:

```typescript
const htmlResponse = await client.execute(
  client.buildTransactionPayload({ payment_option: 'abapay', ... }),
  { allowHtml: true }  // ⚠️ Advanced: returns HTML string
);
```

## API Reference

### PayWayClient

```typescript
const client = new PayWayClient(
  base_url: string,      // e.g., 'https://checkout-sandbox.payway.com.kh/'
  merchant_id: string,   // Your merchant ID
  api_key: string        // Your API key
)
```

### Methods

#### Overview

| Method | Purpose | Returns | Use Case |
|--------|---------|---------|----------|
| `buildTransactionPayload()` | Build payment payload | `PayloadBuilderResponse` | Create payments |
| `buildCheckTransactionPayload()` | Build status check payload | `PayloadBuilderResponse` | Check status |
| `buildTransactionListPayload()` | Build transaction list payload | `PayloadBuilderResponse` | List transactions |
| `execute()` | Execute a payload (server-to-server) | `Promise<any>` | Server API calls |
| `create_hash()` | Generate HMAC-SHA512 hash | `string` | Manual signing |

---

#### 1. buildTransactionPayload()

Build a payment transaction payload for client-side form submission.

```typescript
const payload = client.buildTransactionPayload({
  tran_id: "ORDER-123",
  amount: 100,
  currency: "USD",
  payment_option: "abapay",
  return_url: "https://yoursite.com/callback",
  firstname: "John",
  lastname: "Doe",
  email: "john@example.com",
  phone: "+855123456789"
});

// Returns:
{
  fields: {
    req_time: "20241214223000",
    merchant_id: "your_merchant_id",
    tran_id: "ORDER-123",
    amount: "100",
    currency: "USD",
    payment_option: "abapay",
    return_url: "aHR0cHM6Ly...",  // base64 encoded
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com",
    phone: "+855123456789",
    hash: "abc123..."              // HMAC-SHA512 signature
  },
  hash: "abc123...",               // Same hash for reference
  url: "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase",
  method: "POST"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | Recommended | Unique transaction ID |
| `amount` | number \| string | Yes | Transaction amount |
| `currency` | "USD" \| "KHR" | No | Currency code (default: USD) |
| `payment_option` | PaymentOption | No | Payment method (see below) |
| `return_url` | string | Recommended | URL to redirect after payment (auto base64 encoded) |
| `return_deeplink` | string \| object | No | Mobile app deeplink (auto base64 encoded) |
| `continue_success_url` | string | No | Success continuation URL |
| `firstname` | string | No | Customer first name |
| `lastname` | string | No | Customer last name |
| `email` | string | No | Customer email |
| `phone` | string | No | Customer phone number |
| `pwt` | string | No | PayWay token |
| `view_type` | ViewType | No | Payment page view type: `"hosted_view"` (new tab) or `"popup"` (modal/bottom sheet). **Note:** Not included in hash signature |

**Payment Options:**

- `cards` - Card payments
- `abapay` - ABA PAY
- `abapay_deeplink` - ABA PAY deeplink
- `abapay_khqr_deeplink` - ABA PAY and KHQR deeplink
- `wechat` - WeChat Wallet
- `alipay` - Alipay Wallet
- `bakong` - Bakong

**View Types:**

The `view_type` parameter controls how the payment page is displayed:

- `"hosted_view"` - Redirects payer to a new tab/window (default behavior)
- `"popup"` - Displays as a modal popup on desktop browsers and bottom sheet on mobile web browsers

**Important:** The `view_type` field is included in form fields but is **NOT included in the hash signature**. This is by design according to ABA PayWay specifications.

**Example with view_type:**

```typescript
const payload = client.buildTransactionPayload({
  payment_option: 'abapay',
  amount: 100,
  tran_id: 'ORDER-123',
  view_type: 'popup'  // Show as popup instead of redirect
});
```

---

#### 2. buildCheckTransactionPayload()

Build a payload to check transaction status.

```typescript
const payload = client.buildCheckTransactionPayload("ORDER-123");

// Pattern 1: Manual server-to-server request
const formData = new FormData();
for (const [key, value] of Object.entries(payload.fields)) {
  formData.append(key, value);
}

const response = await fetch(payload.url, {
  method: payload.method,
  body: formData
});

const result = await response.json();

// Pattern 2: Use execute() method (recommended)
const result = await client.execute(payload);
```

---

#### 3. buildTransactionListPayload()

Build a payload to retrieve transaction list.

```typescript
const payload = client.buildTransactionListPayload({
  from_date: "20240101000000",
  to_date: "20240131235959",
  status: "APPROVED"
});

// Pattern 1: Manual server-to-server request
const formData = new FormData();
for (const [key, value] of Object.entries(payload.fields)) {
  formData.append(key, value);
}

const response = await fetch(payload.url, {
  method: payload.method,
  body: formData
});

const transactions = await response.json();

// Pattern 2: Use execute() method (recommended)
const transactions = await client.execute(payload);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_date` | string | No | Start date (yyyyMMddHHmmss) |
| `to_date` | string | No | End date (yyyyMMddHHmmss) |
| `from_amount` | number \| string | No | Minimum amount |
| `to_amount` | number \| string | No | Maximum amount |
| `status` | TransactionStatus | No | Transaction status filter |

---

#### 4. execute()

Execute a payload with server-to-server HTTP request. This method makes the actual API call to ABA PayWay.

```typescript
async execute(
  payload: PayloadBuilderResponse,
  options?: ExecuteOptions
): Promise<any>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payload` | `PayloadBuilderResponse` | Yes | Payload from build methods |
| `options` | `ExecuteOptions` | No | Execution options |

**ExecuteOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowHtml` | boolean | `false` | Allow HTML responses (for advanced use) |

**Returns:** `Promise<any>` - The JSON response from ABA PayWay API

**Throws:**
- Error if `payment_option === "abapay"` without `allowHtml: true`
- Error if response is HTML without `allowHtml: true`
- Error if HTTP request fails

**Examples:**

```typescript
// Create a payment (NOT abapay)
const result = await client.execute(
  client.buildTransactionPayload({
    payment_option: 'cards',
    amount: 100,
    tran_id: 'ORDER-123'
  })
);

// Check transaction status
const status = await client.execute(
  client.buildCheckTransactionPayload('ORDER-123')
);

// List transactions
const transactions = await client.execute(
  client.buildTransactionListPayload({ status: 'APPROVED' })
);

// Advanced: Allow HTML response (not recommended)
const html = await client.execute(
  client.buildTransactionPayload({ payment_option: 'abapay', ... }),
  { allowHtml: true }
);
```

**⚠️ Important:**
- Use this method for server-to-server API calls only
- Do NOT use with `payment_option: 'abapay'` unless you specifically need to handle HTML
- For `abapay`, use Pattern 1 (client-side form submission) instead

---

#### 5. create_hash()

Utility method to create HMAC-SHA512 hash (used internally).

```typescript
const hash = client.create_hash(['value1', 'value2', 'value3']);
// Returns: base64 encoded HMAC-SHA512 hash
```

## Complete Examples

### Next.js App Router

```typescript
// ==============================================
// app/api/payment/create/route.ts
// ==============================================
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function POST(request: Request) {
  try {
    const { amount, orderId, customerEmail } = await request.json();
    
    const payload = client.buildTransactionPayload({
      tran_id: orderId,
      amount,
      currency: 'USD',
      payment_option: 'abapay',
      email: customerEmail,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
    });
    
    return Response.json(payload);
  } catch (error) {
    return Response.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// ==============================================
// app/components/PaymentForm.tsx
// ==============================================
'use client';

import { useState } from 'react';

export default function PaymentForm() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get payload from server
      const payload = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          orderId: `ORDER-${Date.now()}`,
          customerEmail: 'customer@example.com'
        })
      }).then(r => r.json());
      
      // Create and submit form
      const form = document.createElement('form');
      form.method = payload.method;
      form.action = payload.url;
      
      Object.entries(payload.fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });
      
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('Payment failed:', error);
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay $100'}
      </button>
    </form>
  );
}
```

### Next.js Pages Router

```typescript
// ==============================================
// pages/api/payment/create.ts
// ==============================================
import { PayWayClient } from 'payway-ts';
import type { NextApiRequest, NextApiResponse } from 'next';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, orderId } = req.body;
    
    const payload = client.buildTransactionPayload({
      tran_id: orderId,
      amount,
      currency: 'USD',
      payment_option: 'abapay',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
    });
    
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
}
```

### Server-to-Server Examples

#### Check Transaction Status

```typescript
// app/api/payment/status/[tranId]/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { tranId: string } }
) {
  try {
    const status = await client.execute(
      client.buildCheckTransactionPayload(params.tranId)
    );
    
    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### List Transactions

```typescript
// app/api/payment/list/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  
  try {
    const transactions = await client.execute(
      client.buildTransactionListPayload({
        status: status as any,
        from_date: '20240101000000',
        to_date: '20241231235959'
      })
    );
    
    return Response.json(transactions);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Process Card Payment (Server-to-Server)

```typescript
// app/api/payment/card/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function POST(request: Request) {
  const { amount, orderId, customerEmail } = await request.json();
  
  try {
    // Server-to-server for card payments
    const result = await client.execute(
      client.buildTransactionPayload({
        tran_id: orderId,
        amount,
        currency: 'USD',
        payment_option: 'cards',  // NOT abapay
        email: customerEmail,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
      })
    );
    
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Environment Variables

Create a `.env.local` file:

```env
# Sandbox
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh/
PAYWAY_MERCHANT_ID=your_sandbox_merchant_id
PAYWAY_API_KEY=your_sandbox_api_key

# Production
# PAYWAY_BASE_URL=https://checkout.payway.com.kh/
# PAYWAY_MERCHANT_ID=your_production_merchant_id
# PAYWAY_API_KEY=your_production_api_key

NEXT_PUBLIC_APP_URL=https://yoursite.com
```

## TypeScript Support

All methods are fully typed:

```typescript
import type { 
  PayWayClient,
  CreateTransactionParams,
  PayloadBuilderResponse,
  TransactionStatus,
  PaymentOption,
  ExecuteOptions  // New!
} from 'payway-ts';

const params: CreateTransactionParams = {
  amount: 100,
  tran_id: 'ORDER-123',
  currency: 'USD',
  payment_option: 'abapay'
};

const payload: PayloadBuilderResponse = client.buildTransactionPayload(params);

// TypeScript knows the structure
payload.fields.hash;   // ✓ string
payload.url;           // ✓ string
payload.method;        // ✓ "POST"

// Execute with options
const options: ExecuteOptions = { allowHtml: false };
const result = await client.execute(payload, options);
```

## Utility Functions

### trim()

Utility function to trim strings, passes through other types.

```typescript
import { trim } from 'payway-ts';

trim("  hello  ");  // "hello"
trim(null);          // null
trim(undefined);     // undefined
```

## How It Works

### 1. Hash Generation

The SDK uses HMAC-SHA512 to sign requests:

```typescript
// Hash is created from: req_time + merchant_id + all field values (in order)
const hashInput = [
  req_time,        // "20241214223000"
  merchant_id,     // "your_merchant_id"
  ...fieldValues   // All other field values in the order they were added
];

const hash = HMAC_SHA512(hashInput.join(''), api_key);
```

### 2. Base64 Encoding

The SDK automatically base64 encodes:
- `return_url` - Your callback URL
- `return_deeplink` - Mobile app deeplinks

This is required by ABA PayWay API.

### 3. Field Ordering

While the hash generation cares about order, the returned `fields` object can be iterated in any order for form creation (browsers don't guarantee form field order anyway).

## Security

- **Never expose your API key** - Always use environment variables
- **Server-side only** - Build payloads on your server, never in the browser
- **HMAC signing** - All payloads are automatically signed with HMAC-SHA512
- **HTTPS only** - Always use HTTPS in production
- **Validate callbacks** - Always verify transaction status on your server after payment (don't trust client-side data)

## Common Pitfalls

### ❌ Using `abapay` with `execute()`

```typescript
// DON'T DO THIS
await client.execute(
  client.buildTransactionPayload({ payment_option: 'abapay', ... })
);
// Error: Cannot execute transactions with payment_option "abapay" from server
```

**Why?** `abapay` returns HTML, not JSON. Use client-side form submission instead.

### ❌ Making HTTP requests from the browser

```typescript
// DON'T DO THIS (in browser)
const client = new PayWayClient(url, merchantId, apiKey); // Exposes API key!
```

**Why?** Your API key would be exposed. Always build payloads on the server.

### ✅ Correct Pattern

```typescript
// Server: Build payload
const payload = client.buildTransactionPayload({ ... });
return Response.json(payload);

// Client: Create form and submit
const form = document.createElement('form');
// ... add fields from payload
form.submit();
```

## Testing

```bash
npm test
npm run test:coverage
```

## Building

```bash
npm run build
npm run typecheck
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Disclaimer

This is an **unofficial** SDK and is not affiliated with or endorsed by ABA Bank. Use at your own risk.

For ABA PayWay API documentation and support, please contact ABA Bank directly or visit https://www.payway.com.kh/developers/

## Author

**tykealy**

## Links

- [npm package](https://www.npmjs.com/package/payway-ts)
- [GitHub repository](https://github.com/tykealy/payway-ts)
- [ABA Bank](https://www.ababank.com/)
- [PayWay Developer Docs](https://www.payway.com.kh/developers/)
