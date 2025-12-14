import { describe, it, expect } from 'vitest';
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
  describe('create_hash', () => {
    it('should create correct HMAC-SHA512 hash', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      const hash = client.create_hash(['a', 'b', 'c']);
      expect(hash).toBe('JcTO3d5PoVoVRPIWjUg9bTRrSTpFhu9JXOLm+nLjrmDatGZuSz9eDv323DX05K1r/BYx60AQVZ+GOWbTS4XUvw==');
    });
  });

  describe('create_payload', () => {
    it('should create FormData with req_time, merchant_id, and hash', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      const date = new Date(0);
      const data = client.create_payload({
        a: 'a-value',
        b: 'b-value',
        c: null,
        d: undefined,
      }, date);

      expect(data.has("req_time")).toBe(true);
      expect(data.get("merchant_id")).toBe("1");
      expect(data.has("hash")).toBe(true);
      expect(data.get("a")).toBe('a-value');
      expect(data.get("b")).toBe('b-value');
      expect(data.has('c')).toBe(false);
      expect(data.has('d')).toBe(false);
    });
  });

  describe('client_factory', () => {
    it('should use custom client factory when provided', () => {
      const client = new PayWayClient(
        "http://example.com",
        "1",
        "1",
        (thisRef) => thisRef.base_url
      );
      expect(client._client).toBe("http://example.com");
    });
  });

  describe('default client', () => {
    it('should create default client with post method', () => {
      const client = new PayWayClient("http://example.com", "1", "1");
      expect('post' in client._client).toBe(true);
      expect(typeof client._client.post).toBe('function');
    });
  });
});
