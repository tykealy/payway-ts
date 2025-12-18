# Error Handling

The SDK provides detailed error information to help you debug and handle errors properly.

## Error Object Structure

When an API call fails, the error object contains:

```typescript
interface PayWayAPIError extends Error {
  message: string;        // Error message
  status: number;         // HTTP status code (403, 400, 500, etc.)
  statusText: string;     // HTTP status text ("Forbidden", "Bad Request", etc.)
  body: any;              // Response body from ABA PayWay (JSON or text)
}
```

## Basic Error Handling

```typescript
import type { PayWayAPIError } from 'payway-ts';

try {
  const result = await client.execute(
    client.buildCompletePreAuthPayload({
      tran_id: 'ORDER-123',
      complete_amount: 100
    })
  );
  
  if (result.status.code === '00') {
    console.log('✅ Success');
  }
} catch (error: any) {
  console.error('❌ Error:', error.message);
  
  if (error.status) {
    console.error('Status:', error.status, error.statusText);
    console.error('Response:', error.body);
  }
}
```

## HTTP Status Codes

### Common Status Codes

| Code | Meaning | Typical Cause | Solution |
|------|---------|---------------|----------|
| 400 | Bad Request | Invalid parameters or payload | Check your payload parameters |
| 403 | Forbidden | Authentication failed | Verify merchant ID and API key |
| 404 | Not Found | Invalid endpoint or transaction ID | Check transaction ID exists |
| 500 | Internal Server Error | Server-side issue | Retry later or contact support |

### Handling Specific Status Codes

```typescript
try {
  const result = await client.execute(payload);
} catch (error: any) {
  if (error.status) {
    switch (error.status) {
      case 400:
        console.error('❌ Bad request - check payload parameters');
        console.error('Details:', error.body);
        break;
        
      case 403:
        console.error('❌ Access forbidden - check credentials');
        console.error('Verify merchant_id and api_key are correct');
        break;
        
      case 404:
        console.error('❌ Not found - check transaction ID');
        break;
        
      case 500:
        console.error('❌ Server error - try again later');
        break;
        
      default:
        console.error(`❌ HTTP ${error.status}: ${error.statusText}`);
        console.error('Response:', error.body);
    }
  } else {
    console.error('❌ Unexpected error:', error.message);
  }
}
```

## Common Error Scenarios

### 1. Missing RSA Public Key

Pre-auth operations require an RSA public key.

```typescript
try {
  const result = await client.execute(
    client.buildCompletePreAuthPayload({
      tran_id: 'ORDER-123',
      complete_amount: 100
    })
  );
} catch (error: any) {
  if (error.message.includes('RSA public key is required')) {
    console.error('❌ Missing RSA public key');
    console.error('Solution: Provide RSA key in PayWayClient constructor');
    console.error('const client = new PayWayClient(url, id, key, RSA_KEY)');
  }
}
```

### 2. Using `abapay` with `execute()`

```typescript
try {
  await client.execute(
    client.buildTransactionPayload({
      payment_option: 'abapay',
      amount: 100
    })
  );
} catch (error: any) {
  if (error.message.includes('Cannot execute transactions with payment_option "abapay"')) {
    console.error('❌ Cannot use abapay with execute()');
    console.error('Solution: Use client-side form submission pattern instead');
    console.error('See: docs/client-side-form-submission.md');
  }
}
```

### 3. Invalid Pre-Auth Status

```typescript
try {
  const result = await client.execute(
    client.buildCompletePreAuthPayload({
      tran_id: 'ORDER-123',
      complete_amount: 100
    })
  );
} catch (error: any) {
  if (error.status === 400 && error.body) {
    // Check if transaction is already completed/cancelled
    console.error('❌ Cannot complete pre-auth');
    console.error('Possible reasons:');
    console.error('- Transaction already completed');
    console.error('- Transaction cancelled');
    console.error('- Transaction expired');
    console.error('- Invalid transaction ID');
  }
}
```

### 4. Amount Exceeds Limit

```typescript
try {
  const result = await client.execute(
    client.buildCompletePreAuthPayload({
      tran_id: 'ORDER-123',
      complete_amount: 150  // Original was 100
    })
  );
} catch (error: any) {
  if (error.status === 400) {
    console.error('❌ Amount exceeds allowed limit');
    console.error('For cards: Maximum +10% of original amount');
    console.error('Original: 100, Maximum allowed: 110');
  }
}
```

## Complete Error Handling Example

```typescript
async function processPayment(orderId: string, amount: number) {
  const client = new PayWayClient(
    process.env.PAYWAY_BASE_URL!,
    process.env.PAYWAY_MERCHANT_ID!,
    process.env.PAYWAY_API_KEY!,
    process.env.ABA_RSA_PUBLIC_KEY
  );

  try {
    const result = await client.execute(
      client.buildCompletePreAuthPayload({
        tran_id: orderId,
        complete_amount: amount
      })
    );

    // Check result status
    if (result.status && result.status.code === '00') {
      console.log('✅ Payment successful');
      return { success: true, data: result };
    } else {
      console.warn('⚠️ Payment not approved');
      return { 
        success: false, 
        error: 'Payment not approved',
        code: result.status?.code 
      };
    }
    
  } catch (error: any) {
    // Network or API error
    if (error.status) {
      console.error(`❌ API Error ${error.status}: ${error.statusText}`);
      console.error('Response:', error.body);
      
      return {
        success: false,
        error: `API Error: ${error.statusText}`,
        status: error.status,
        details: error.body
      };
    }
    
    // SDK error (validation, missing config, etc.)
    console.error('❌ SDK Error:', error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Logging Best Practices

### Development

Log detailed information for debugging:

```typescript
try {
  const result = await client.execute(payload);
  console.log('Success:', JSON.stringify(result, null, 2));
} catch (error: any) {
  console.error('Error Details:', {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    body: error.body,
    stack: error.stack
  });
}
```

### Production

Log only necessary information, avoid exposing sensitive data:

```typescript
try {
  const result = await client.execute(payload);
  logger.info('Payment completed', {
    tranId: result.tran_id,
    status: result.transaction_status
  });
} catch (error: any) {
  logger.error('Payment failed', {
    tranId: payload.fields.tran_id,
    status: error.status,
    // Don't log: API keys, full request/response bodies
  });
}
```

## Retry Strategies

### Simple Retry with Exponential Backoff

```typescript
async function executeWithRetry(
  client: PayWayClient,
  payload: PayloadBuilderResponse,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.execute(payload);
    } catch (error: any) {
      // Only retry on 500 errors
      if (error.status === 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### Don't Retry On

- 400 Bad Request (fix your payload instead)
- 403 Forbidden (fix your credentials instead)
- 404 Not Found (transaction doesn't exist)

### Safe to Retry On

- 500 Internal Server Error
- Network timeout errors
- Connection refused errors

## Validation Errors

The SDK performs some client-side validation before making API calls:

```typescript
// Missing required parameters
client.buildTransactionPayload({
  // Missing 'amount' - will throw error
  tran_id: 'ORDER-123'
});
// Error: amount is required

// Using abapay with execute()
await client.execute(
  client.buildTransactionPayload({ payment_option: 'abapay', ... })
);
// Error: Cannot execute transactions with payment_option "abapay"

// Pre-auth without RSA key
const client = new PayWayClient(url, id, key); // No RSA key
await client.execute(
  client.buildCompletePreAuthPayload({ ... })
);
// Error: RSA public key is required for pre-authorization operations
```

## Debugging Tips

### 1. Check API Credentials

```typescript
console.log('Base URL:', process.env.PAYWAY_BASE_URL);
console.log('Merchant ID:', process.env.PAYWAY_MERCHANT_ID);
console.log('API Key:', process.env.PAYWAY_API_KEY?.substring(0, 10) + '...');
```

### 2. Inspect Payload Before Executing

```typescript
const payload = client.buildTransactionPayload({ ... });
console.log('Payload:', JSON.stringify(payload, null, 2));

// Then execute
const result = await client.execute(payload);
```

### 3. Check Transaction Status Separately

```typescript
// If a transaction fails, check its status
const status = await client.execute(
  client.buildCheckTransactionPayload('ORDER-123')
);
console.log('Current status:', status);
```

### 4. Verify Hash Signature

The SDK automatically generates hash signatures. If you suspect an issue:

```typescript
const hash = client.create_hash(['value1', 'value2', 'value3']);
console.log('Generated hash:', hash);
```

## Next Steps

- [Review security best practices](security.md)
- [See complete API reference](api-reference.md)
- [Learn about pre-authorization](pre-authorization.md)
