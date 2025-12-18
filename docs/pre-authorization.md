# Pre-Authorization Transactions

Pre-authorization is a **two-step payment process** that allows you to reserve funds first, then capture them later.

## How Pre-Auth Works

```
Step 1: Reserve Funds
Merchant → PayWay: Create transaction (type: "pre-auth")
PayWay → Bank: Request authorization
Bank: Reserve $100
Bank → PayWay: Authorized
PayWay → Merchant: Status: "PRE-AUTH"

Step 2: Capture Funds (later)
Merchant → PayWay: Complete pre-auth
PayWay → Bank: Capture reserved funds
Bank: Transfer $100
Bank → PayWay: Completed
PayWay → Merchant: Status: "COMPLETED"
```

## Common Use Cases

- **Hotels** - Reserve on booking, charge at checkout
- **Car Rentals** - Reserve deposit, charge final amount with extras
- **Restaurants** - Reserve amount, add tip later
- **Marketplaces** - Verify funds, capture after fulfillment

## Security: RSA Encryption Required

Pre-auth operations require **ABA Bank's RSA public key** for encryption:

```typescript
const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!,
  process.env.ABA_RSA_PUBLIC_KEY!  // Required for pre-auth
);
```

**Two-Layer Security:**
1. **RSA Encryption** - Sensitive data encrypted with ABA's public key (only ABA can decrypt)
2. **HMAC Signing** - Request integrity verified with your API key

## Step 1: Create Pre-Auth Transaction

Reserve funds without immediately capturing them.

```typescript
// Create a pre-authorization (reserve funds)
const payload = client.buildTransactionPayload({
  tran_id: 'ORDER-123',
  amount: 100,
  currency: 'USD',
  payment_option: 'cards',
  type: 'pre-auth',  // Important: Set type to pre-auth
  return_url: 'https://yoursite.com/callback'
});

const result = await client.execute(payload);
// Result: { transaction_status: "PRE-AUTH", ... }
```

## Step 2a: Complete Pre-Auth (Capture Funds)

Capture the reserved funds when ready.

### Complete with Authorized Amount

```typescript
// Complete with the authorized amount
const result = await client.execute(
  client.buildCompletePreAuthPayload({
    tran_id: 'ORDER-123',
    complete_amount: 100  // Required: the amount to capture
  })
);

console.log(result.transaction_status); // "COMPLETED"
console.log(result.grand_total);        // 100
```

### Complete with Increased Amount (+10% for Cards)

For card payments, you can capture up to 10% more than the original authorization:

```typescript
// Complete with increased amount (+10% allowed for card payments)
const result = await client.execute(
  client.buildCompletePreAuthPayload({
    tran_id: 'ORDER-123',
    complete_amount: 110  // Original was 100, can add up to 10%
  })
);
```

## Step 2b: Complete with Payout

For marketplace scenarios where funds need to be split among multiple beneficiaries:

```typescript
const result = await client.execute(
  client.buildCompletePreAuthWithPayoutPayload({
    tran_id: 'ORDER-123',
    complete_amount: 100,
    payout: [
      { acc: '123456', amt: 80 },  // Vendor gets 80%
      { acc: '789012', amt: 20 }   // Platform fee 20%
    ]
  })
);
```

**Note:** The payout array contains objects with `acc` (account number) and `amt` (amount) fields. Funds will be distributed according to this array.

## Step 2c: Cancel Pre-Auth (Release Funds)

If the transaction won't proceed, release the reserved funds:

```typescript
const result = await client.execute(
  client.buildCancelPreAuthPayload({
    tran_id: 'ORDER-123'
  })
);

console.log(result.transaction_status); // "CANCELLED"
```

## Pre-Auth Rules & Limitations

| Rule | Description |
|------|-------------|
| **One-time completion** | Can only complete pre-auth once |
| **Expiration** | Pre-auth expires after a certain period (check with ABA Bank) |
| **+10% for cards** | Card payments can complete with up to 10% more than original |
| **No double completion** | Cannot complete already completed/cancelled pre-auth |
| **RSA required** | Must provide RSA public key in client constructor |

## Multi-Merchant System

If you're building a system where multiple merchants can configure their own payment methods:

### Database Schema Example

```typescript
interface PaymentMethod {
  id: string;
  merchant_id: string;              // ABA merchant ID (plain text)
  api_key: string;                  // ENCRYPT with AES-256 in database
  aba_rsa_public_key: string;       // ABA's public key (plain text OK)
  base_url: string;                 // Sandbox or production URL
  created_by_admin_id: string;
}
```

### Implementation Example

```typescript
// Fetch merchant credentials from database
async function processPreAuthCompletion(merchantId: string, tranId: string) {
  // Get credentials from database
  const credentials = await db.getPaymentMethod(merchantId);
  
  // Initialize client with merchant's keys
  const client = new PayWayClient(
    credentials.base_url,
    credentials.merchant_id,
    decrypt(credentials.api_key),       // Decrypt API key from database
    credentials.aba_rsa_public_key      // Public key - no decryption needed
  );
  
  // Complete the pre-auth
  const result = await client.execute(
    client.buildCompletePreAuthPayload({ 
      tran_id: tranId,
      complete_amount: 100
    })
  );
  
  return result;
}
```

### Security Best Practices for Database Storage

| Credential | Storage Method | Reason |
|------------|----------------|--------|
| `merchant_id` | Plain text | Not sensitive |
| `api_key` | **Encrypt with AES-256** | Secret key, must be protected |
| `aba_rsa_public_key` | Plain text | It's a public key by design |
| `base_url` | Plain text | Not sensitive |

### Storing Credentials Securely

```typescript
// Example: Storing credentials securely
import { encrypt, decrypt } from './crypto'; // Your encryption utility

async function savePaymentMethod(data: {
  merchant_id: string;
  api_key: string;
  aba_rsa_public_key: string;
}) {
  await db.insert('payment_methods', {
    merchant_id: data.merchant_id,
    api_key: encrypt(data.api_key),           // Encrypt before storing
    aba_rsa_public_key: data.aba_rsa_public_key, // Store as-is
    base_url: process.env.PAYWAY_BASE_URL
  });
}
```

## Complete Example

Here's a complete flow for a hotel booking:

```typescript
// 1. Customer books room - reserve $200
const preAuthResult = await client.execute(
  client.buildTransactionPayload({
    tran_id: 'BOOKING-123',
    amount: 200,
    currency: 'USD',
    payment_option: 'cards',
    type: 'pre-auth',
    return_url: 'https://hotel.com/booking/callback'
  })
);

// 2. Customer checks out - charge $220 (room + minibar)
// Can charge up to $220 (original $200 + 10%)
const completeResult = await client.execute(
  client.buildCompletePreAuthPayload({
    tran_id: 'BOOKING-123',
    complete_amount: 220
  })
);

// OR if customer cancels - release funds
const cancelResult = await client.execute(
  client.buildCancelPreAuthPayload({
    tran_id: 'BOOKING-123'
  })
);
```

## Error Handling

Pre-auth operations can fail for various reasons. See the [Error Handling](error-handling.md) guide for details on handling:

- Missing RSA public key
- Invalid pre-auth status
- Amount exceeds allowed limit
- Already completed/cancelled transactions

## Next Steps

- [Learn about error handling](error-handling.md)
- [See complete API reference](api-reference.md)
- [Review security best practices](security.md)
