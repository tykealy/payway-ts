# Security Best Practices

Keep your ABA PayWay integration secure by following these best practices.

## Core Security Principles

### 1. Never Expose Your API Key

**Always use environment variables** - Never hardcode API keys in your code.

```typescript
// ❌ DON'T DO THIS
const client = new PayWayClient(
  'https://checkout.payway.com.kh/',
  'merchant_123',
  'hardcoded-api-key-here'  // NEVER hardcode!
);

// ✅ DO THIS
const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);
```

### 2. Server-Side Only

**Build payloads on your server** - Never expose API keys to the browser.

```typescript
// ❌ DON'T DO THIS (in browser)
const client = new PayWayClient(url, merchantId, apiKey); // Exposes API key!

// ✅ DO THIS (on server)
// Server: Build payload
const payload = client.buildTransactionPayload({ ... });
return Response.json(payload);

// Client: Create form and submit
const form = document.createElement('form');
// ... add fields from payload
form.submit();
```

### 3. Use HTTPS Only

Always use HTTPS in production to encrypt data in transit.

```typescript
// ✅ Production
PAYWAY_BASE_URL=https://checkout.payway.com.kh/

// ✅ Sandbox
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh/

// ❌ Never use HTTP
PAYWAY_BASE_URL=http://checkout.payway.com.kh/  // INSECURE!
```

### 4. Validate Callbacks

**Always verify transaction status on your server** after payment. Don't trust client-side data.

```typescript
// Payment callback handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tranId = searchParams.get('tran_id');
  
  // ❌ DON'T trust query parameters
  // const status = searchParams.get('status'); // Can be manipulated!
  
  // ✅ DO verify with ABA PayWay API
  const status = await client.execute(
    client.buildCheckTransactionPayload(tranId!)
  );
  
  if (status.transaction_status === 'APPROVED') {
    // Process order
  }
}
```

## Common Pitfalls

### ❌ Pitfall 1: Using `abapay` with `execute()`

```typescript
// DON'T DO THIS
await client.execute(
  client.buildTransactionPayload({ 
    payment_option: 'abapay',
    amount: 100 
  })
);
// Error: Cannot execute transactions with payment_option "abapay" from server
```

**Why?** `abapay` returns HTML, not JSON. Use client-side form submission instead.

**Solution:**

```typescript
// Server: Build payload
const payload = client.buildTransactionPayload({ 
  payment_option: 'abapay',
  amount: 100 
});
return Response.json(payload);

// Client: Create form and submit
const form = document.createElement('form');
form.method = payload.method;
form.action = payload.url;
// ... add fields
form.submit();
```

See [Client-Side Form Submission](client-side-form-submission.md) for details.

---

### ❌ Pitfall 2: Making HTTP Requests from Browser

```typescript
// DON'T DO THIS (in browser)
const client = new PayWayClient(url, merchantId, apiKey); // Exposes API key!
const result = await client.execute(payload);
```

**Why?** Your API key would be exposed in the browser's JavaScript.

**Solution:**

```typescript
// Server: Create API endpoint
export async function POST(request: Request) {
  const client = new PayWayClient(
    process.env.PAYWAY_BASE_URL!,
    process.env.PAYWAY_MERCHANT_ID!,
    process.env.PAYWAY_API_KEY!
  );
  
  const payload = client.buildTransactionPayload({ ... });
  return Response.json(payload);
}

// Client: Call your API endpoint
const payload = await fetch('/api/payment/create', {
  method: 'POST',
  body: JSON.stringify({ amount: 100 })
}).then(r => r.json());
```

---

### ❌ Pitfall 3: Trusting Client Data

```typescript
// DON'T DO THIS
export async function POST(request: Request) {
  const { status, amount } = await request.json();
  
  // Trusting client data without verification!
  if (status === 'APPROVED') {
    await fulfillOrder(amount);
  }
}
```

**Why?** Client-side data can be manipulated. Always verify with ABA's API.

**Solution:**

```typescript
// DO THIS
export async function POST(request: Request) {
  const { tranId } = await request.json();
  
  // Verify with ABA PayWay API
  const status = await client.execute(
    client.buildCheckTransactionPayload(tranId)
  );
  
  if (status.transaction_status === 'APPROVED') {
    await fulfillOrder(status.grand_total);
  }
}
```

---

### ❌ Pitfall 4: Not Using Environment Variables

```typescript
// DON'T DO THIS
const client = new PayWayClient(
  'https://checkout.payway.com.kh/',
  'merchant_123',
  'sk_live_abc123xyz'  // Hardcoded secret!
);
```

**Why?** Secrets in code can be committed to version control, leaked in logs, etc.

**Solution:**

```typescript
// DO THIS
// .env.local
PAYWAY_BASE_URL=https://checkout.payway.com.kh/
PAYWAY_MERCHANT_ID=merchant_123
PAYWAY_API_KEY=sk_live_abc123xyz

// code
const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!
);
```

Add `.env.local` to your `.gitignore`:

```gitignore
.env.local
.env*.local
```

---

### ❌ Pitfall 5: Logging Sensitive Data

```typescript
// DON'T DO THIS
console.log('API Key:', process.env.PAYWAY_API_KEY);
console.log('Request:', payload.fields);  // Contains hash signature
logger.info('Payment request', { apiKey: API_KEY });
```

**Why?** Logs can be stored, accessed by multiple people, or sent to external services.

**Solution:**

```typescript
// DO THIS
console.log('API Key:', process.env.PAYWAY_API_KEY?.substring(0, 10) + '...');
console.log('Transaction ID:', payload.fields.tran_id);  // Only log non-sensitive data

logger.info('Payment request', { 
  tranId: payload.fields.tran_id,
  amount: payload.fields.amount
  // Don't log: api_key, hash, full payload
});
```

## Database Storage

### Storing Merchant Credentials

When building multi-merchant systems, encrypt sensitive credentials:

| Credential | Storage Method | Reason |
|------------|----------------|--------|
| `merchant_id` | Plain text | Not sensitive (public identifier) |
| `api_key` | **Encrypt with AES-256** | Secret key, must be protected |
| `aba_rsa_public_key` | Plain text | It's a public key by design |
| `base_url` | Plain text | Not sensitive |

### Example: Secure Storage

```typescript
import { encrypt, decrypt } from './crypto'; // Your encryption utility

// Storing credentials
async function savePaymentMethod(data: {
  merchant_id: string;
  api_key: string;
  aba_rsa_public_key: string;
}) {
  await db.insert('payment_methods', {
    merchant_id: data.merchant_id,
    api_key: encrypt(data.api_key),           // ✅ Encrypt before storing
    aba_rsa_public_key: data.aba_rsa_public_key, // Plain text OK
    base_url: process.env.PAYWAY_BASE_URL
  });
}

// Retrieving credentials
async function getPaymentClient(merchantId: string) {
  const credentials = await db.getPaymentMethod(merchantId);
  
  return new PayWayClient(
    credentials.base_url,
    credentials.merchant_id,
    decrypt(credentials.api_key),       // ✅ Decrypt when using
    credentials.aba_rsa_public_key
  );
}
```

## Multi-Merchant Systems

### Security Considerations

When building a platform where multiple merchants can configure payment methods:

1. **Isolate Credentials** - Each merchant's credentials should only be accessible to them
2. **Audit Logging** - Log who accesses which credentials and when
3. **Access Control** - Implement proper authorization checks
4. **Encryption at Rest** - Encrypt API keys in database
5. **Secure Transmission** - Use HTTPS for all API communication

### Example Implementation

```typescript
// Middleware to verify merchant access
async function verifyMerchantAccess(
  adminId: string, 
  merchantId: string
): Promise<boolean> {
  const merchant = await db.getPaymentMethod(merchantId);
  return merchant.created_by_admin_id === adminId;
}

// API endpoint with authorization
export async function POST(request: Request) {
  const { merchantId, tranId } = await request.json();
  const adminId = await getAuthenticatedAdminId(request);
  
  // ✅ Verify access
  if (!await verifyMerchantAccess(adminId, merchantId)) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Get merchant's client
  const client = await getPaymentClient(merchantId);
  
  // Process payment
  const result = await client.execute(
    client.buildCompletePreAuthPayload({ tran_id: tranId })
  );
  
  // ✅ Audit log
  await auditLog.create({
    adminId,
    merchantId,
    action: 'complete_preauth',
    tranId
  });
  
  return Response.json(result);
}
```

## Environment Variables Setup

### Development (.env.local)

```env
# Sandbox credentials
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh/
PAYWAY_MERCHANT_ID=sandbox_merchant_id
PAYWAY_API_KEY=sandbox_api_key
ABA_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
..."

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

Use your platform's secrets management:

- **Vercel**: Environment Variables in project settings
- **AWS**: AWS Secrets Manager or Parameter Store
- **Heroku**: Config Vars
- **Docker**: Docker secrets or env files (not committed)

**Never commit production credentials to version control!**

## HMAC Signature Verification

The SDK automatically generates HMAC-SHA512 signatures for request integrity. This ensures:

1. **Data hasn't been tampered with** during transmission
2. **Request is authentic** (only someone with your API key can generate valid signatures)

The signature is automatically included in the `hash` field:

```typescript
const payload = client.buildTransactionPayload({ ... });
// payload.fields.hash contains the HMAC-SHA512 signature
```

ABA PayWay verifies this signature on their end.

## RSA Encryption

Pre-authorization operations use **two-layer security**:

1. **RSA Encryption** - Sensitive data encrypted with ABA's public key
2. **HMAC Signing** - Request integrity verified with your API key

```typescript
const client = new PayWayClient(
  process.env.PAYWAY_BASE_URL!,
  process.env.PAYWAY_MERCHANT_ID!,
  process.env.PAYWAY_API_KEY!,
  process.env.ABA_RSA_PUBLIC_KEY!  // For pre-auth operations
);
```

**Why?** Only ABA Bank can decrypt data encrypted with their public key, ensuring sensitive pre-auth data remains secure.

## Security Checklist

Before going to production:

- [ ] API keys stored in environment variables (not in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] Using HTTPS for all API calls
- [ ] Building payloads server-side only
- [ ] Verifying transaction status with ABA API (not trusting client data)
- [ ] Not logging sensitive data (API keys, hash signatures)
- [ ] Encrypting API keys in database (for multi-merchant systems)
- [ ] Implementing proper access control
- [ ] Using production credentials (not sandbox) in production
- [ ] Audit logging for sensitive operations

## Next Steps

- [Review error handling patterns](error-handling.md)
- [See complete API reference](api-reference.md)
- [Learn about pre-authorization security](pre-authorization.md#security-rsa-encryption-required)
