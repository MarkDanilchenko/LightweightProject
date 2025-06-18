import * as crypto from "crypto";
import AppConfiguration from "../configs/app.configuration.js";

const algorithm = "aes-256-cbc";
const secretKey = AppConfiguration().serverConfiguration.encoderSecret;
const iv = crypto.randomBytes(16);

/**
 * Encrypts a given string using the configured algorithm and secret key.
 * @param strToEncrypt The string to be encrypted.
 *
 * @returns The encrypted string, prefixed with the initialization vector (hex encoded).
 */
function encrypt(strToEncrypt: string): string {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(strToEncrypt, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a given string using the configured algorithm and secret key.
 * @param strToDecrypt The string to be decrypted, should be in the format of "iv:encryptedData" where
 *                     iv is the initialization vector as a hex encoded string and encryptedData is the
 *                     encrypted data as a hex encoded string.
 *
 * @returns The decrypted string.
 */
function decrypt(strToDecrypt: string): string {
  const [ivHex, encryptedHex] = strToDecrypt.split(":");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(ivHex, "hex"));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export { encrypt, decrypt };
