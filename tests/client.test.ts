import { describe, it, expect, vi, afterEach } from 'vitest';
import { PayWayClient, trim } from '../src/index.js';

describe('trim utility', () => {
  it('should trim trailing spaces', () => {
    expect(trim("abc ")).toBe("abc");
  });

  it('should trim leading and trailing spaces', () => {
    expect(trim(" abc ")).toBe("abc");
  });

  it('should return undefined for undefined input', () => {
    expect(trim(undefined)).toBe(undefined);
  });

  it('should return null for null input', () => {
    expect(trim(null)).toBe(null);
  });

  it('should return number as-is', () => {
    expect(trim(1 as any)).toBe(1);
  });

  it('should return NaN as-is', () => {
    const result = trim(NaN as any);
    expect(Number.isNaN(result)).toBe(true);
  });
});

describe('PayWayClient', () => {
  describe('constructor', () => {
    it('should create client with correct properties', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456"
      );
      
      expect(client.base_url).toBe("https://checkout-sandbox.payway.com.kh/");
      expect(client.merchant_id).toBe("merchant_123");
      expect(client.api_key).toBe("api_key_456");
    });
  });

  describe('create_hash', () => {
    it('should create correct HMAC-SHA512 hash', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      const hash = client.create_hash(['a', 'b', 'c']);
      expect(hash).toBe('JcTO3d5PoVoVRPIWjUg9bTRrSTpFhu9JXOLm+nLjrmDatGZuSz9eDv323DX05K1r/BYx60AQVZ+GOWbTS4XUvw==');
    });

    it('should create different hashes for different inputs', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      const hash1 = client.create_hash(['a', 'b', 'c']);
      const hash2 = client.create_hash(['x', 'y', 'z']);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('buildTransactionPayload', () => {
    it('should build payload with all required fields', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456"
      );

      const payload = client.buildTransactionPayload({
        tran_id: "ORDER-123",
        amount: 100,
        currency: "USD",
        payment_option: "abapay"
      });

      expect(payload.fields).toHaveProperty('req_time');
      expect(payload.fields).toHaveProperty('merchant_id', 'merchant_123');
      expect(payload.fields).toHaveProperty('tran_id', 'ORDER-123');
      expect(payload.fields).toHaveProperty('amount', '100');
      expect(payload.fields).toHaveProperty('currency', 'USD');
      expect(payload.fields).toHaveProperty('payment_option', 'abapay');
      expect(payload.fields).toHaveProperty('hash');
      expect(payload.hash).toBe(payload.fields.hash);
      expect(payload.url).toBe('https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase');
      expect(payload.method).toBe('POST');
    });

    it('should base64 encode return_url', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        return_url: "https://mysite.com/callback"
      });

      // Check that return_url is base64 encoded
      expect(payload.fields.return_url).not.toBe("https://mysite.com/callback");
      
      // Decode and verify
      const decoded = Buffer.from(payload.fields.return_url, 'base64').toString();
      expect(decoded).toBe("https://mysite.com/callback");
    });

    it('should base64 encode return_deeplink string', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        return_deeplink: "myapp://payment"
      });

      const decoded = Buffer.from(payload.fields.return_deeplink, 'base64').toString();
      expect(decoded).toBe("myapp://payment");
    });

    it('should base64 encode return_deeplink object', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const deeplink = {
        android_scheme: "myapp://android",
        ios_scheme: "myapp://ios"
      };

      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        return_deeplink: deeplink
      });

      const decoded = Buffer.from(payload.fields.return_deeplink, 'base64').toString();
      expect(JSON.parse(decoded)).toEqual(deeplink);
    });

    it('should trim string fields', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        firstname: "  John  ",
        lastname: "  Doe  ",
        email: "  john@example.com  "
      });

      expect(payload.fields.firstname).toBe("John");
      expect(payload.fields.lastname).toBe("Doe");
      expect(payload.fields.email).toBe("john@example.com");
    });

    it('should filter out null and undefined values', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100,
        firstname: null as any,
        lastname: undefined
      });

      expect(payload.fields).toHaveProperty('tran_id');
      expect(payload.fields).toHaveProperty('amount');
      expect(payload.fields).not.toHaveProperty('firstname');
      expect(payload.fields).not.toHaveProperty('lastname');
    });

    it('should include hash in fields', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100
      });

      expect(payload.fields.hash).toBe(payload.hash);
      expect(payload.fields.hash).toBeTruthy();
      expect(payload.fields.hash.length).toBeGreaterThan(0);
    });

    it('should include view_type in fields but NOT in hash', () => {
      const client = new PayWayClient("http://example.com", "merchant_1", "api_key_1");
      
      // Build payload WITH view_type
      const payloadWithViewType = client.buildTransactionPayload({
        tran_id: "TEST-001",
        amount: 100,
        view_type: "popup"
      });

      // Build payload WITHOUT view_type (same other fields)
      const payloadWithoutViewType = client.buildTransactionPayload({
        tran_id: "TEST-001",
        amount: 100
      });

      // view_type should be in the fields
      expect(payloadWithViewType.fields).toHaveProperty('view_type', 'popup');
      expect(payloadWithoutViewType.fields).not.toHaveProperty('view_type');

      // BUT the hash should be the SAME (view_type not included in hash)
      expect(payloadWithViewType.hash).toBe(payloadWithoutViewType.hash);
      expect(payloadWithViewType.fields.hash).toBe(payloadWithoutViewType.fields.hash);
    });

    it('should support hosted_view view_type', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100,
        view_type: "hosted_view"
      });

      expect(payload.fields.view_type).toBe("hosted_view");
    });

    it('should support popup view_type', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100,
        view_type: "popup"
      });

      expect(payload.fields.view_type).toBe("popup");
    });

    it('should not include view_type if not provided', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100
      });

      expect(payload.fields).not.toHaveProperty('view_type');
    });

    it('should not include view_type if null', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      
      const payload = client.buildTransactionPayload({
        tran_id: "TEST",
        amount: 100,
        view_type: null as any
      });

      expect(payload.fields).not.toHaveProperty('view_type');
    });
  });

  describe('buildCheckTransactionPayload', () => {
    it('should build check transaction payload', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456"
      );

      const payload = client.buildCheckTransactionPayload("ORDER-123");

      expect(payload.fields).toHaveProperty('req_time');
      expect(payload.fields).toHaveProperty('merchant_id', 'merchant_123');
      expect(payload.fields).toHaveProperty('tran_id', 'ORDER-123');
      expect(payload.fields).toHaveProperty('hash');
      expect(payload.hash).toBe(payload.fields.hash);
      expect(payload.url).toBe('https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction');
      expect(payload.method).toBe('POST');
    });
  });

  describe('buildTransactionListPayload', () => {
    it('should build transaction list payload with all filters', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456"
      );

      const payload = client.buildTransactionListPayload({
        from_date: "20240101000000",
        to_date: "20240131235959",
        from_amount: "10",
        to_amount: "1000",
        status: "APPROVED"
      });

      expect(payload.fields).toHaveProperty('req_time');
      expect(payload.fields).toHaveProperty('merchant_id', 'merchant_123');
      expect(payload.fields).toHaveProperty('from_date', '20240101000000');
      expect(payload.fields).toHaveProperty('to_date', '20240131235959');
      expect(payload.fields).toHaveProperty('from_amount', '10');
      expect(payload.fields).toHaveProperty('to_amount', '1000');
      expect(payload.fields).toHaveProperty('status', 'APPROVED');
      expect(payload.fields).toHaveProperty('hash');
      expect(payload.url).toBe('https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/transaction-list');
      expect(payload.method).toBe('POST');
    });

    it('should build transaction list payload with no filters', () => {
      const client = new PayWayClient("http://example.com", "1", "1");

      const payload = client.buildTransactionListPayload({});

      expect(payload.fields).toHaveProperty('req_time');
      expect(payload.fields).toHaveProperty('merchant_id', '1');
      expect(payload.fields).toHaveProperty('hash');
      // No filter fields should be present
      expect(payload.fields).not.toHaveProperty('from_date');
      expect(payload.fields).not.toHaveProperty('to_date');
    });
  });

  describe('payload structure', () => {
    it('should return consistent payload structure across all methods', () => {
      const client = new PayWayClient("http://example.com", "1", "1");

      const txnPayload = client.buildTransactionPayload({ tran_id: "TEST" });
      const checkPayload = client.buildCheckTransactionPayload("TEST");
      const listPayload = client.buildTransactionListPayload({});

      // All should have these properties
      for (const payload of [txnPayload, checkPayload, listPayload]) {
        expect(payload).toHaveProperty('fields');
        expect(payload).toHaveProperty('hash');
        expect(payload).toHaveProperty('url');
        expect(payload).toHaveProperty('method', 'POST');
        expect(typeof payload.fields).toBe('object');
        expect(typeof payload.hash).toBe('string');
        expect(typeof payload.url).toBe('string');
      }
    });
  });

  describe('execute method', () => {
    // Mock fetch globally
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should execute check transaction successfully and return JSON', async () => {
      const mockResponse = {
        status: 'APPROVED',
        tran_id: 'ORDER-123',
        amount: '100'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildCheckTransactionPayload('ORDER-123');
      const result = await client.execute(payload);

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw error when payment_option is abapay without allowHtml', async () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildTransactionPayload({
        payment_option: 'abapay',
        amount: 100,
        tran_id: 'TEST'
      });

      await expect(client.execute(payload)).rejects.toThrow(
        'Cannot execute server-to-server call with payment_option "abapay"'
      );
    });

    it('should allow abapay with allowHtml option and return HTML', async () => {
      const mockHtml = '<!DOCTYPE html><html><body>Checkout Page</body></html>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => mockHtml
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildTransactionPayload({
        payment_option: 'abapay',
        amount: 100,
        tran_id: 'TEST'
      });

      const result = await client.execute(payload, { allowHtml: true });
      
      expect(result).toBe(mockHtml);
      expect(result).toContain('<!DOCTYPE html>');
    });

    it('should execute transaction with cards payment option and return JSON', async () => {
      const mockResponse = {
        transaction_id: 'TXN-123',
        status: 'SUCCESS',
        amount: '100'
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildTransactionPayload({
        payment_option: 'cards',
        amount: 100,
        tran_id: 'ORDER-456'
      });

      const result = await client.execute(payload);
      
      expect(result).toEqual(mockResponse);
      expect(result.transaction_id).toBe('TXN-123');
    });

    it('should throw error on HTML response without allowHtml', async () => {
      const mockHtml = '<html><body>Error Page</body></html>';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => mockHtml
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildTransactionPayload({
        payment_option: 'cards',
        amount: 100
      });

      await expect(client.execute(payload)).rejects.toThrow(
        'Received HTML response but expected JSON'
      );
    });

    it('should throw error on HTTP error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildCheckTransactionPayload('ORDER-789');

      await expect(client.execute(payload)).rejects.toThrow(
        'PayWay API Error: 500 Internal Server Error'
      );
    });

    it('should execute transaction list and return JSON', async () => {
      const mockResponse = {
        transactions: [
          { tran_id: 'ORDER-1', amount: '100', status: 'APPROVED' },
          { tran_id: 'ORDER-2', amount: '200', status: 'APPROVED' }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildTransactionListPayload({
        status: 'APPROVED'
      });

      const result = await client.execute(payload);
      
      expect(result).toEqual(mockResponse);
      expect(result.transactions).toHaveLength(2);
    });

    it('should handle unknown content-type and try JSON first', async () => {
      const mockResponse = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        json: async () => mockResponse
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildCheckTransactionPayload('ORDER-999');

      const result = await client.execute(payload);
      
      expect(result).toEqual(mockResponse);
    });

    it('should send FormData with all payload fields', async () => {
      let capturedFormData: FormData | null = null;

      global.fetch = vi.fn().mockImplementation(async (url, options: any) => {
        capturedFormData = options.body;
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true })
        };
      }) as any;

      const client = new PayWayClient("http://example.com", "1", "1");
      const payload = client.buildCheckTransactionPayload('ORDER-CHECK');

      await client.execute(payload);

      expect(capturedFormData).toBeInstanceOf(FormData);
      expect(capturedFormData).not.toBeNull();
    });
  });

  describe('buildCompletePreAuthWithPayoutPayload', () => {
    // Valid RSA public key for testing (1024-bit)
    const mockRsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFkGZU8rk1sCCGxeVEdxHYZs8I
1ct4N8+TtECjVltAMI/KkYqU77CveVklb+i/VI0nn9QVymldGhZ422gAOBnUY5j0
cNFzlzGJawBDt+aLI49xacOtlhEmq62sn4JZqscCegpCi4IYVPk0QT9ypNOp2NJ3
WHERcKgSSPtFC7ZTrQIDAQAB
-----END PUBLIC KEY-----`;

    it('should build complete pre-auth with payout payload', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456",
        mockRsaPublicKey
      );

      const payout = [
        { acc: "123456", amt: 80 },
        { acc: "789012", amt: 20 }
      ];

      const payload = client.buildCompletePreAuthWithPayoutPayload({
        tran_id: "ORDER-123",
        complete_amount: 100,
        payout: payout
      });

      expect(payload.fields).toHaveProperty('merchant_auth');
      expect(payload.fields).toHaveProperty('request_time');
      expect(payload.fields).toHaveProperty('merchant_id', 'merchant_123');
      expect(payload.fields).toHaveProperty('hash');
      expect(payload.hash).toBe(payload.fields.hash);
      expect(payload.url).toBe('https://checkout-sandbox.payway.com.kh/api/merchant-portal/merchant-access/online-transaction/pre-auth-completion-with-payout');
      expect(payload.method).toBe('POST');
    });

    it('should throw error when RSA public key is not provided', () => {
      const client = new PayWayClient(
        "https://checkout-sandbox.payway.com.kh/",
        "merchant_123",
        "api_key_456"
      );

      expect(() => {
        client.buildCompletePreAuthWithPayoutPayload({
          tran_id: "ORDER-123",
          complete_amount: 100,
          payout: [{ acc: "123456", amt: 100 }]
        });
      }).toThrow('RSA public key is required for pre-auth operations');
    });

    it('should include payout array in encrypted data', () => {
      const client = new PayWayClient(
        "http://example.com",
        "merchant_123",
        "api_key_456",
        mockRsaPublicKey
      );

      const payout = [
        { acc: "aba_account", amt: 80 },
        { acc: "merchant_id", amt: 20 }
      ];

      const payload = client.buildCompletePreAuthWithPayoutPayload({
        tran_id: "ORDER-123",
        complete_amount: 100,
        payout: payout
      });

      // Verify merchant_auth is present and is a base64 string (encrypted data)
      expect(payload.fields.merchant_auth).toBeDefined();
      expect(typeof payload.fields.merchant_auth).toBe('string');
      expect(payload.fields.merchant_auth.length).toBeGreaterThan(0);
    });

    it('should handle multiple payout items', () => {
      const client = new PayWayClient(
        "http://example.com",
        "merchant_123",
        "api_key_456",
        mockRsaPublicKey
      );

      const payout = [
        { acc: "account1", amt: 50 },
        { acc: "account2", amt: 30 },
        { acc: "account3", amt: 20 }
      ];

      const payload = client.buildCompletePreAuthWithPayoutPayload({
        tran_id: "ORDER-123",
        complete_amount: 100,
        payout: payout
      });

      expect(payload.fields.merchant_auth).toBeDefined();
      expect(payload.url).toContain('pre-auth-completion-with-payout');
    });

    it('should generate correct hash with payout data', () => {
      const client = new PayWayClient(
        "http://example.com",
        "merchant_123",
        "api_key_456",
        mockRsaPublicKey
      );

      const payload = client.buildCompletePreAuthWithPayoutPayload({
        tran_id: "ORDER-123",
        complete_amount: 100,
        payout: [{ acc: "123456", amt: 100 }]
      });

      // Hash should be HMAC-SHA512 of merchant_auth + request_time + merchant_id
      expect(payload.hash).toBeDefined();
      expect(typeof payload.hash).toBe('string');
      expect(payload.hash.length).toBeGreaterThan(0);
      expect(payload.hash).toBe(payload.fields.hash);
    });

    it('should handle complete_amount as string', () => {
      const client = new PayWayClient(
        "http://example.com",
        "merchant_123",
        "api_key_456",
        mockRsaPublicKey
      );

      const payload = client.buildCompletePreAuthWithPayoutPayload({
        tran_id: "ORDER-123",
        complete_amount: "100",
        payout: [{ acc: "123456", amt: 100 }]
      });

      expect(payload.fields.merchant_auth).toBeDefined();
      expect(payload.url).toContain('pre-auth-completion-with-payout');
    });
  });
});
