# payway-ts Documentation

Welcome to the payway-ts documentation! This guide will help you integrate ABA PayWay payment processing into your application.

## Table of Contents

### Getting Started
- [Getting Started](getting-started.md) - Choose your integration pattern and understand the two approaches

### Integration Guides
- [Client-Side Form Submission](client-side-form-submission.md) - Pattern 1: Build payloads on server, submit forms from browser (for `abapay`)
- [Server-to-Server](server-to-server.md) - Pattern 2: Execute API calls directly from your server (for other payment options)

### Advanced Features
- [Pre-Authorization](pre-authorization.md) - Two-step payment process: reserve funds first, capture later

### Reference
- [API Reference](api-reference.md) - Complete documentation of all methods, parameters, and types
- [Error Handling](error-handling.md) - Handle errors properly with detailed error information
- [Security Best Practices](security.md) - Keep your integration secure and avoid common pitfalls

## Quick Navigation

### I want to...
- **Accept ABA PAY payments** → [Client-Side Form Submission](client-side-form-submission.md)
- **Accept card payments** → [Server-to-Server](server-to-server.md)
- **Check transaction status** → [Server-to-Server: Check Status](server-to-server.md#check-transaction-status)
- **List transactions** → [Server-to-Server: List Transactions](server-to-server.md#list-transactions)
- **Reserve funds first, charge later** → [Pre-Authorization](pre-authorization.md)
- **Split payments to multiple accounts** → [Pre-Authorization: Complete with Payout](pre-authorization.md#complete-with-payout)
- **See all available methods** → [API Reference](api-reference.md)

### I'm using...
- **Next.js App Router** → [Client-Side Examples](client-side-form-submission.md#nextjs-app-router)
- **Next.js Pages Router** → [Client-Side Examples](client-side-form-submission.md#nextjs-pages-router)
- **Multiple merchant accounts** → [Pre-Authorization: Multi-Merchant](pre-authorization.md#multi-merchant-system)

## Recommended Reading Order

### For Beginners
1. [Getting Started](getting-started.md) - Understand the two integration patterns
2. [Client-Side Form Submission](client-side-form-submission.md) OR [Server-to-Server](server-to-server.md) - Choose based on your payment option
3. [Error Handling](error-handling.md) - Learn how to handle errors properly
4. [Security Best Practices](security.md) - Avoid common security pitfalls

### For Advanced Users
1. [Pre-Authorization](pre-authorization.md) - Implement two-step payments
2. [API Reference](api-reference.md) - Deep dive into all available methods
3. [Security Best Practices](security.md#multi-merchant-systems) - Multi-merchant setup

## Need Help?

- Check the [Security Best Practices](security.md#common-pitfalls) for common issues
- Review the [Error Handling](error-handling.md) guide for debugging tips
- See the [API Reference](api-reference.md) for complete method documentation
- Contact ABA Bank directly for PayWay API support: https://www.payway.com.kh/developers/
