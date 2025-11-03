import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import AppConfiguration from "@server/configs/app.configuration";

const scryptAsync = promisify(scrypt);
const keylen = 64;

/**
 * Hashes the given string using the scrypt algorithm with a secret key.
 *
 * @param {string} toHash - The string to be hashed.
 *
 * @returns {Promise<string>} A promise that resolves to the hashed string in hexadecimal format.
 */
async function hash(toHash: string): Promise<string> {
  const salt: Buffer = Buffer.from(AppConfiguration().serverConfiguration.commonSecret, "hex");
  const hash = (await scryptAsync(toHash, salt, keylen)) as Buffer;

  return hash.toString("hex");
}

/**
 * Verifies that the given string matches a previously hashed string.
 *
 * @param {string} toHash - The string to be compared to the stored hash.
 * @param {string} hash - The stored hash string in hexadecimal format.
 *
 * @returns {Promise<boolean>} A promise that resolves to true if the string matches the stored hash, otherwise false.
 */
async function verifyHash(toHash: string, hash: string): Promise<boolean> {
  const salt: Buffer = Buffer.from(AppConfiguration().serverConfiguration.commonSecret, "hex");
  const hashToCompare = (await scryptAsync(toHash, salt, keylen)) as Buffer;
  const storedHash: Buffer = Buffer.from(hash, "hex");

  if (hashToCompare.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(hashToCompare, storedHash);
}

export { hash, verifyHash };
