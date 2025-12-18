# Client-Side Form Submission (Pattern 1)

**Best for:** `abapay` payment option

This pattern is required when using `abapay` because ABA PayWay returns an HTML checkout page that must be rendered in the browser.

## Flow Overview

```
1. Server (Next.js API) → Build signed payload using SDK
2. Server → Client → Send payload as JSON
3. Client (Browser) → Create hidden HTML form from payload
4. Client → ABA PayWay → Submit form directly to ABA
5. ABA → Client → ABA handles checkout and redirects back to your return_url
```

## How It Works

### Step 1: Server-Side - Build Payload

Your server builds a signed payload with all payment information. The SDK automatically:
- Generates a timestamp (`req_time`)
- Base64 encodes URLs (`return_url`, `return_deeplink`)
- Creates HMAC-SHA512 signature (`hash`)

```typescript
// app/api/payment/create/route.ts
import { PayWayClient } from 'payway-ts';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
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

**Payload Structure:**

```typescript
{
  fields: {
    req_time: "20241214223000",
    merchant_id: "your_merchant_id",
    tran_id: "ORDER-123",
    amount: "100",
    currency: "USD",
    payment_option: "abapay",
    return_url: "aHR0cHM6Ly...",  // base64 encoded
    hash: "abc123..."              // HMAC-SHA512 signature
  },
  hash: "abc123...",
  url: "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase",
  method: "POST"
}
```

### Step 2: Client-Side - Create and Submit Form

Your client receives the payload and creates an HTML form that submits directly to ABA PayWay.

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

## Payment Options

The following payment options work with this pattern:

- `abapay` - ABA PAY (required for this pattern)
- `abapay_deeplink` - ABA PAY deeplink
- `abapay_khqr_deeplink` - ABA PAY and KHQR deeplink

## View Types

Control how the payment page is displayed:

- `"hosted_view"` - Redirects to a new tab/window (default)
- `"popup"` - Modal popup on desktop, bottom sheet on mobile

```typescript
const payload = client.buildTransactionPayload({
  payment_option: 'abapay',
  amount: 100,
  tran_id: 'ORDER-123',
  view_type: 'popup'  // Show as popup
});
```

**Note:** The `view_type` field is included in form fields but is NOT included in the hash signature (by design).

## Important Notes

1. **Server-side payload building** - Always build payloads on your server to protect your API key
2. **Never use execute()** - Don't use `client.execute()` with `abapay`, it returns HTML not JSON
3. **Security** - The hash signature ensures data integrity during transmission
4. **Base64 encoding** - URLs are automatically base64 encoded by the SDK

## Next Steps

- [Handle payment callbacks and verify status](server-to-server.md#check-transaction-status)
- [Implement error handling](error-handling.md)
- [Learn security best practices](security.md)
