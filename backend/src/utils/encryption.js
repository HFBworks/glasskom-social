import crypto from 'crypto';

/**
 * Simple encryption utilities for message content.
 * For production E2E encryption, consider using established libraries like
 * TweetNaCl, libsodium, or Signal Protocol implementation.
 */

// Generate a random encryption key
export const generateKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Encrypt message content using AES-256-GCM
export const encryptMessage = (content, key) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

// Decrypt message content
export const decryptMessage = (encryptedData, key) => {
  try {
    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

// Simple base64 encoding for client-side encryption (matches existing implementation)
export const encodeMessage = (content) => {
  return Buffer.from(content, 'utf8').toString('base64');
};

// Simple base64 decoding
export const decodeMessage = (encoded) => {
  try {
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch (error) {
    return encoded;
  }
};

// Generate a key pair for asymmetric encryption (for future E2E improvements)
export const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
};

// Encrypt with public key
export const encryptWithPublicKey = (content, publicKey) => {
  const buffer = Buffer.from(content, 'utf8');
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString('base64');
};

// Decrypt with private key
export const decryptWithPrivateKey = (encryptedContent, privateKey) => {
  const buffer = Buffer.from(encryptedContent, 'base64');
  const decrypted = crypto.privateDecrypt(privateKey, buffer);
  return decrypted.toString('utf8');
};

export default {
  generateKey,
  encryptMessage,
  decryptMessage,
  encodeMessage,
  decodeMessage,
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey
};
backend/src/utils/encryption.js
