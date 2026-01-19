import fs from 'fs';
import path from 'path';

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveLocal(buffer, targetPath) {
  const fullPath = path.join(process.cwd(), 'backend', targetPath);
  await ensureDir(path.dirname(fullPath));
  if (Buffer.isBuffer(buffer)) {
    fs.writeFileSync(fullPath, buffer);
  } else if (typeof buffer === 'string') {
    // assume base64
    fs.writeFileSync(fullPath, Buffer.from(buffer, 'base64'));
  } else {
    throw new Error('Unsupported buffer type for local save');
  }
  return targetPath;
}

async function saveS3(buffer, key) {
  // dynamic import to avoid hard dependency when not used
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION });

  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer, 'base64');

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: body,
  });

  await client.send(cmd);
  // return key (caller can compose URL)
  return key;
}

export async function saveFile(base64OrBuffer, filename) {
  const targetPath = `storage/${filename}`;
  if (PROVIDER === 's3') {
    const key = await saveS3(base64OrBuffer, targetPath);
    return { provider: 's3', path: key };
  }

  const pathSaved = await saveLocal(base64OrBuffer, targetPath);
  return { provider: 'local', path: pathSaved };
}

export default { saveFile };
