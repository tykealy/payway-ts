# Getting Started

## Two Integration Patterns

payway-ts provides two integration patterns to accommodate different payment flows:

### Pattern 1: Client-Side Form Submission

Use this when you want the browser to submit directly to ABA PayWay.

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

Use this when you want your server to communicate directly with ABA API.

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

## Decision Tree

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

## Next Steps

- **For `abapay` payments** → Read [Client-Side Form Submission](client-side-form-submission.md)
- **For other payment options** → Read [Server-to-Server](server-to-server.md)
- **For two-step payments** → Read [Pre-Authorization](pre-authorization.md)
