import crypto from 'crypto';

const KEY_ENV = process.env.CERT_KEY || process.env.CERT_KEY_BASE64 || '';

function getKey() {
  if (!KEY_ENV) {
    throw new Error('CERT_KEY environment variable is required for certificate encryption');
  }

  // Accept base64 or raw string; derive 32-byte key via sha256 if needed
  let keyBuf;
  try {
    keyBuf = Buffer.from(KEY_ENV, 'base64');
    if (keyBuf.length !== 32) throw new Error('not 32');
  } catch (e) {
    // derive
    keyBuf = crypto.createHash('sha256').update(KEY_ENV).digest();
  }
  return keyBuf;
}

export function encryptBase64String(base64str) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const buf = Buffer.from(base64str, 'base64');
  const encrypted = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();

  // store as: iv(12) | tag(16) | encrypted
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptToBase64(encryptedBuffer) {
  if (!encryptedBuffer) return null;
  const key = getKey();
  const iv = encryptedBuffer.slice(0, 12);
  const tag = encryptedBuffer.slice(12, 28);
  const ciphertext = encryptedBuffer.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('base64');
}

export default { encryptBase64String, decryptToBase64 };
