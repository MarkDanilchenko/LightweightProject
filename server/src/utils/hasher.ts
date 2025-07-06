import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import AppConfiguration from "../configs/app.configuration.js";

const scryptAsync = promisify(scrypt);
const keylen = 64;

/**
 * Hashes the given string using the scrypt algorithm with a secret key.
 *
 * @param toHash - The string to be hashed.
 *
 * @returns A promise that resolves to the hashed string in hexadecimal format.
 */
async function hash(toHash: string): Promise<string> {
  const salt: Buffer = Buffer.from(AppConfiguration().serverConfiguration.commonSecret, "hex");
  const hash = (await scryptAsync(toHash, salt, keylen)) as Buffer;

  return hash.toString("hex");
}

/**
 * Verifies that the given string matches a previously hashed string.
 *
 * @param toHash - The string to be compared to the stored hash.
 * @param hash - The stored hash string in hexadecimal format.
 *
 * @returns A promise that resolves to true if the string matches the stored hash, otherwise false.
 */
async function verifyHash(toHash: string, hash: string): Promise<boolean> {
  const salt: Buffer = Buffer.from(AppConfiguration().serverConfiguration.commonSecret, "hex");

  if (!hash) {
    return false;
  }

  const hashToCompare = (await scryptAsync(toHash, salt, keylen)) as Buffer;
  const storedHash: Buffer = Buffer.from(hash, "hex");

  if (hashToCompare.length !== storedHash.length) {
    return false;
  }

  const verified = timingSafeEqual(hashToCompare, storedHash);

  return verified;
}

export { hash, verifyHash };
