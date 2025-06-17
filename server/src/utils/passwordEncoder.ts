import * as bcrypt from "bcrypt";
import AppConfiguration from "../configs/app.configuration.js";

const hashConfiguration = {
  hashSalt: AppConfiguration().serverConfiguration.hashSecret,
};

async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, hashConfiguration.hashSalt);

  return hash;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hash);

  return isValid;
}

export { hashPassword, verifyPassword };
