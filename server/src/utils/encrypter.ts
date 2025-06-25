import * as crypto from "crypto";
import AppConfiguration from "../configs/app.configuration.js";

const algorithm = "aes-256-cbc";

/**
 * Encrypts the given string applying AES-256-CBC with a secret key.
 *
 * @param {string} strToEncrypt The string to be encrypted.
 * @returns {string} The encrypted string.
 */
function encrypt(strToEncrypt: string): string {
  const iv = crypto.randomBytes(16);
  const secretKey = Buffer.from(AppConfiguration().serverConfiguration.encoderSecret, "hex");

  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(strToEncrypt, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted using the
 * `encrypt` function.
 *
 * @param {string} strToDecrypt The string to be decrypted.
 * @returns {string} The decrypted string.
 */
function decrypt(strToDecrypt: string): string {
  const secretKey = Buffer.from(AppConfiguration().serverConfiguration.encoderSecret, "hex");

  const [ivHex, encryptedHex] = strToDecrypt.split(":");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(ivHex, "hex"));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export { encrypt, decrypt };
