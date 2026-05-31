import crypto from "node:crypto";

import { env } from "@/lib/env";

function getEncryptionKey() {
  const seed = env.UPSTREAM_KEY_ENCRYPTION_KEY ?? env.AUTH_SECRET;

  return crypto.createHash("sha256").update(seed).digest();
}

export function encryptProviderApiKey(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptProviderApiKey(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");

  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Invalid upstream key ciphertext.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}
