# payway-ts

> TypeScript SDK for ABA PayWay payment integration - Server-side only

[![npm version](https://img.shields.io/npm/v/payway-ts.svg)](https://www.npmjs.com/package/payway-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An unofficial, type-safe TypeScript SDK for integrating ABA PayWay payments into your Node.js and Next.js applications.

> [!WARNING]  
> This is not a product of ABA Bank. This is an unofficial implementation based on https://www.payway.com.kh/developers/

## Features

- ✅ **Full TypeScript Support** - Complete type definitions for all API endpoints
- 🔒 **Server-Side Only** - Built for secure server-side usage (Node.js 18+)
- 🚀 **ES Modules** - Native ESM support for modern applications
- 🔐 **HMAC-SHA512 Signing** - Automatic request signing with your API key
- 🎯 **Next.js Ready** - Works seamlessly with Next.js API routes and server components
- 📦 **Lightweight** - Only 2 dependencies (date-fns, formdata-node)
- 🛡️ **Type Safe** - Catch errors at compile time, not runtime

## Installation

```bash
npm install payway-ts
```

```bash
yarn add payway-ts
```

```bash
pnpm add payway-ts
```

## Requirements

- Node.js 18.0.0 or higher
- ABA Bank merchant account with API credentials

## Quick Start

### Basic Usage

```typescript
import { PayWayClient } from 'payway-ts';

// Initialize the client
const client = new PayWayClient(
  'https://checkout-sandbox.payway.com.kh/',
  'your_merchant_id',
  'your_api_key',
);

// Create a transaction
const data = await client.create_transaction({
  tran_id: "example-01",
  payment_option: "abapay_deeplink",
  amount: 1,
  currency: "USD",
  return_url: "https://example.com/callback",
});

console.log('Transaction created:', data);
```

### Next.js App Router

```typescript
// app/api/create-payment/route.ts
import { PayWayClient } from 'payway-ts';
import { NextResponse } from 'next/server';

const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);

export async function POST(request: Request) {
  try {
    const { amount, orderId } = await request.json();
    
    const result = await client.create_transaction({
      amount,
      tran_id: orderId,
      currency: "USD",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment creation failed:', error);
    return NextResponse.json(
      { error: 'Payment creation failed' },
      { status: 500 }
    );
  }
}
```

### Next.js Pages Router

```typescript
// pages/api/create-payment.ts
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
    
    const result = await client.create_transaction({
      amount,
      tran_id: orderId,
      currency: "USD",
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Payment creation failed:', error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
}
```

## API Reference

### PayWayClient

```typescript
class PayWayClient {
  constructor(
    base_url: string,
    merchant_id: string,
    api_key: string,
    client_factory?: (thisRef: PayWayClient) => any
  )
}
```

#### Methods

### 1. Create Transaction

Create a new payment transaction.

```typescript
await client.create_transaction({
  tran_id: "ORDER-123",
  payment_option: "abapay_deeplink",
  amount: 10.00,
  currency: "USD",
  return_url: "https://yoursite.com/callback",
  return_deeplink: "myapp://payment/callback",
  continue_success_url: "https://yoursite.com/success",
  firstname: "John",
  lastname: "Doe",
  email: "john@example.com",
  phone: "+855123456789",
  pwt: "optional_pwt_token"
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | No | Unique transaction ID |
| `payment_option` | PaymentOption | No | Payment method (cards, abapay, etc.) |
| `amount` | number \| string | No | Transaction amount |
| `currency` | "USD" \| "KHR" | No | Currency code |
| `return_url` | string | No | URL to redirect after payment |
| `return_deeplink` | string \| object | No | Mobile app deeplink |
| `continue_success_url` | string | No | Success continuation URL |
| `firstname` | string | No | Customer first name |
| `lastname` | string | No | Customer last name |
| `email` | string | No | Customer email |
| `phone` | string | No | Customer phone number |
| `pwt` | string | No | PayWay token |

**Payment Options:**

- `cards` - Card payments
- `abapay` - ABA PAY
- `abapay_deeplink` - ABA PAY deeplink
- `abapay_khqr_deeplink` - ABA PAY and KHQR deeplink
- `wechat` - WeChat Wallet
- `alipay` - Alipay Wallet
- `bakong` - Bakong

### 2. Check Transaction

Check the status of a transaction.

```typescript
const status = await client.check_transaction("ORDER-123");
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tran_id` | string | Yes | Transaction ID to check |

### 3. Transaction List

Retrieve a list of transactions based on filters.

```typescript
const transactions = await client.transaction_list({
  from_date: "20240101000000",
  to_date: "20240131235959",
  status: "APPROVED"
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from_date` | string | No | Start date (yyyyMMddHHmmss) |
| `to_date` | string | No | End date (yyyyMMddHHmmss) |
| `from_amount` | number \| string | No | Minimum amount |
| `to_amount` | number \| string | No | Maximum amount |
| `status` | TransactionStatus | No | Transaction status filter |

**Transaction Status Values:**

- `APPROVED` - Transaction approved
- `DECLINED` - Transaction declined
- `PENDING` - Transaction pending
- `PRE-AUTH` - Pre-authorized
- `CANCELLED` - Transaction cancelled
- `REFUNDED` - Transaction refunded

## Utility Functions

### trim

Utility function to trim strings, passes through other types.

```typescript
import { trim } from 'payway-ts';

trim("  hello  ");  // "hello"
trim(null);          // null
trim(undefined);     // undefined
trim(123);           // 123
```

## Environment Variables

Create a `.env.local` file in your project:

```env
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh/
PAYWAY_MERCHANT_ID=your_merchant_id
PAYWAY_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=https://yoursite.com
```

**Environment URLs:**

- **Sandbox**: `https://checkout-sandbox.payway.com.kh/`
- **Production**: `https://checkout.payway.com.kh/`

## TypeScript Support

All API methods are fully typed:

```typescript
import type { 
  PayWayClient,
  CreateTransactionParams, 
  TransactionListParams,
  TransactionStatus,
  PaymentOption
} from 'payway-ts';

const params: CreateTransactionParams = {
  amount: 10.00,
  tran_id: 'ORDER-123',
  email: 'customer@example.com',
  payment_option: 'cards',
  currency: 'USD'
};
```

## Advanced Usage

### Custom HTTP Client

You can provide a custom HTTP client factory for testing or custom behavior:

```typescript
const client = new PayWayClient(
  'https://checkout-sandbox.payway.com.kh/',
  'merchant_id',
  'api_key',
  (thisRef) => ({
    async post(url: string, data: any) {
      // Custom HTTP logic
      console.log('Posting to:', url);
      return { data: { success: true } };
    }
  })
);
```

### Error Handling

```typescript
try {
  const result = await client.create_transaction({
    amount: 10,
    tran_id: 'ORDER-123'
  });
  console.log('Success:', result);
} catch (error) {
  if (error instanceof Error) {
    console.error('Payment failed:', error.message);
  }
}
```

## Next.js Compatibility

This SDK works seamlessly with Next.js:

✅ **App Router** - Works in Server Components, Route Handlers, and Server Actions  
✅ **Pages Router** - Works in API routes and getServerSideProps  
✅ **Server Components** - Use in async Server Components  
✅ **Server Actions** - Use in Server Actions for form submissions  
✅ **Edge Runtime** - Compatible with Edge Runtime (with limitations)

**Note**: This is a server-side only package. Do not use in client components.

## Testing

The SDK includes comprehensive tests using Vitest:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Building

Build the TypeScript source:

```bash
npm run build
```

Development mode with watch:

```bash
npm run dev
```

## Supported Features

- [x] Create Transaction
- [x] Check Transaction
- [x] List Transactions
- [ ] Refund Transaction
- [ ] Pre-Authorization
- [ ] Account-On-File (AOF)
- [ ] Card-On-File (COF)
- [ ] Create Payment Link

## Security

- **Never expose your API key** - Always use environment variables
- **Server-side only** - Never use this SDK in client-side code
- **HMAC signing** - All requests are automatically signed with HMAC-SHA512
- **Secure communication** - Always use HTTPS in production

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This is an **unofficial** SDK and is not affiliated with or endorsed by ABA Bank. Use at your own risk.

## Support

For ABA PayWay API documentation and support, please contact ABA Bank directly or visit https://www.payway.com.kh/developers/

For SDK issues, please open an issue on GitHub.

## Author

**tykealy**

## Acknowledgments

This implementation is based on the original [payway-js](https://github.com/seanghay/payway-js) by Seanghay Yath.

## Links

- [npm package](https://www.npmjs.com/package/payway-ts)
- [GitHub repository](https://github.com/tykealy/payway-ts)
- [ABA Bank](https://www.ababank.com/)
- [PayWay Developer Docs](https://www.payway.com.kh/developers/)
