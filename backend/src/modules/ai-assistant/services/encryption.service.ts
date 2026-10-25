import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor() {
    // 32-byte key derived from APP_KEY / ENCRYPTION_SECRET or secure default in dev
    const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'pharmacy-enterprise-secure-master-key-2026';
    // Hash to ensure strictly 32 bytes for aes-256
    const hash = require('crypto').createHash('sha256').update(secret).digest();
    this.secretKey = hash;
  }

  /**
   * Encrypts plaintext using AES-256-GCM with a random 12-byte IV.
   * Returns formatted string: iv:authTag:ciphertext (hex)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM formatted ciphertext.
   * Throws if tampered, corrupted, or tag mismatch.
   */
  decrypt(payload: string): string {
    const parts = (payload || '').split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    if (
      !ivHex ||
      !authTagHex ||
      !encryptedHex ||
      !/^[0-9a-fA-F]+$/.test(ivHex) ||
      !/^[0-9a-fA-F]+$/.test(authTagHex) ||
      !/^[0-9a-fA-F]+$/.test(encryptedHex)
    ) {
      throw new Error('Invalid encrypted payload hex encoding');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
