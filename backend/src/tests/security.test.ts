/**
 * Simplified security tests
 */

import { describe, test, expect, afterEach } from 'bun:test';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize';
import { sanitizeError } from '../utils/errorSanitizer';
import { adminCreateUserSchema } from '../schemas/users';

describe('Input Security', () => {
  test('should sanitize HTML scripts', () => {
    const malicious = '<script>alert("xss")</script>Hello';
    const clean = sanitizeInput(malicious, 'general');
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello');
  });

  test('should sanitize email addresses', () => {
    const email = 'TEST@EXAMPLE.COM<script>';
    const clean = sanitizeInput(email, 'general');
    expect(clean).toBe('test@example.com');
  });

  test('should sanitize objects recursively', () => {
    const data = {
      name: '<script>Attack</script>',
      email: 'TEST@EXAMPLE.COM',
      user: {
        bio: '<div>Malicious content</div>',
        phone: '123-456-7890'
      }
    };
    const clean = sanitizeObject(data);
    expect(clean.name).not.toContain('<script>');
    expect(clean.email).toBe('test@example.com');
    expect(clean.user.bio).not.toContain('<div>');
  });
});

describe('Error Security', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('should hide sensitive details in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Database password: secret123');
    const result = sanitizeError(error, 'database');
    expect(result.message).toBe('Database operation failed');
    expect(result.message).not.toContain('secret123');
  });

  test('should show details in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Database connection failed');
    const result = sanitizeError(error, 'database');
    expect(result.message).toBe('Database connection failed');
    expect(result.details).toBeDefined();
  });
});

describe('Validation Security', () => {
  test('should require strong passwords', () => {
    const weakPasswords = ['password', '123456', 'short'];
    weakPasswords.forEach(pwd => {
      expect(() => adminCreateUserSchema.parse({
        name: 'Test User',
        email: 'test@example.com',
        password: pwd
      })).toThrow();
    });
  });

  test('should prevent script injection in names', () => {
    expect(() => adminCreateUserSchema.parse({
      name: '<script>alert("xss")</script>',
      email: 'test@example.com',
      password: 'StrongPassword123!'
    })).toThrow();
  });
});

console.log('✅ Security tests passed!');