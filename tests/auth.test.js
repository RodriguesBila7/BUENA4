import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateToken } from '../server/middleware/auth.js';

describe('Authentication & Security Tests', () => {
  it('should generate a valid JWT token', () => {
    const user = { id: 1, username: 'admin', role_id: 'super_admin' };
    const token = generateToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT structure: header.payload.signature
  });

  it('should securely hash passwords', () => {
    const password = 'securepassword123';
    const hash = bcrypt.hashSync(password, 10);
    expect(hash).not.toBe(password);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
    expect(bcrypt.compareSync('wrongpassword', hash)).toBe(false);
  });
});
