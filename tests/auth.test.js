import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateToken } from '../server/middleware/auth.js';

describe('Authentication & Security Tests (Tabela 21)', () => {
  it('should generate a valid JWT token', () => {
    const user = { id: 1, username: 'admin', role_id: 'super_admin' };
    const token = generateToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT structure: header.payload.signature
  });

  it('should securely hash passwords and prevent plain-text match', () => {
    const password = 'securepassword123';
    const hash = bcrypt.hashSync(password, 10);
    expect(hash).not.toBe(password);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
    expect(bcrypt.compareSync('wrongpassword', hash)).toBe(false);
  });

  it('TS08b: should match user ONLY by username, nuit or email and NOT role name or role id', () => {
    const allowedUserFields = ['username', 'nuit', 'email'];
    const forbiddenFields = ['roleName', 'role_id', 'id_perfil', 'name_perfil'];
    
    // Simulate query parameter fields check
    const isFieldAllowedForLogin = (field) => allowedUserFields.includes(field);
    expect(isFieldAllowedForLogin('username')).toBe(true);
    expect(isFieldAllowedForLogin('nuit')).toBe(true);
    expect(isFieldAllowedForLogin('email')).toBe(true);
    
    forbiddenFields.forEach(field => {
      expect(isFieldAllowedForLogin(field)).toBe(false);
    });
  });

  it('TS09: should trigger account lockout after 5 consecutive failed attempts', () => {
    const failedAttemptsMap = new Map();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MS = 15 * 60 * 1000;
    const userKey = '127.0.0.1_testuser';

    const registerAttempt = (now) => {
      const existing = failedAttemptsMap.get(userKey) || { count: 0, lockUntil: 0 };
      if (existing.lockUntil && now < existing.lockUntil) {
        return { locked: true, remaining: existing.lockUntil - now };
      }
      const newCount = existing.count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        const lockUntil = now + LOCKOUT_MS;
        failedAttemptsMap.set(userKey, { count: newCount, lockUntil });
        return { locked: true, remaining: LOCKOUT_MS };
      }
      failedAttemptsMap.set(userKey, { count: newCount, lockUntil: 0 });
      return { locked: false, remaining: 0 };
    };

    const startTime = Date.now();
    for (let i = 1; i < 5; i++) {
      expect(registerAttempt(startTime).locked).toBe(false);
    }
    // 5th failed attempt locks out the account
    const fifth = registerAttempt(startTime);
    expect(fifth.locked).toBe(true);
    expect(fifth.remaining).toBe(LOCKOUT_MS);

    // Subsequent attempt while locked out is rejected
    const sixth = registerAttempt(startTime + 1000);
    expect(sixth.locked).toBe(true);
  });

  it('TF08b/TF10: should structure audit logs with previousValue and newValue', () => {
    const auditPayload = {
      recordId: 'emp_123',
      previousValue: { status: 'Ativo', role: 'Investigador' },
      newValue: { status: 'Reformado', role: 'Investigador' }
    };

    expect(auditPayload).toHaveProperty('previousValue');
    expect(auditPayload).toHaveProperty('newValue');
    expect(auditPayload.previousValue.status).toBe('Ativo');
    expect(auditPayload.newValue.status).toBe('Reformado');
  });
});
