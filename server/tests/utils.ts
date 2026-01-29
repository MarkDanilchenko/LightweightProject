import * as jwt from "jsonwebtoken";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { faker } from "@faker-js/faker";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { DataSource } from "typeorm";

/**
 * Generates random valid JWT token for testing purposes.
 * @param {TokenPayload} [payload] - The payload to be used in the token.
 * @param {jwt.SignOptions} [options] - The options to be used in the token.
 * @param {string} [secretOrPrivateKey] - The secret or private key to be used in the token.
 *
 * @returns {string} JWT token that can be used in test cases.
 */
function randomValidJwt(
  payload: TokenPayload = {
    userId: faker.string.uuid(),
    provider: faker.helpers.arrayElement([
      AuthenticationProvider.GITHUB,
      AuthenticationProvider.GOOGLE,
      AuthenticationProvider.KEYCLOAK,
      AuthenticationProvider.LOCAL,
    ]),
    jwti: faker.string.uuid(),
  },
  options: jwt.SignOptions = { expiresIn: "1d" },
  secretOrPrivateKey: string = "aFEo3Q8YBou-secretJwtKeyForTesting-FzM1sHSsEF3",
): string {
  return jwt.sign(payload, secretOrPrivateKey, options);
}

/**
 * Truncates all tables in the database and restarts the identity of each table.
 * This function is used in tests to clean the database before running the tests.
 *
 * @param {DataSource} dataSource - The data source to use for cleaning the database.
 *
 * @returns {Promise<void>} A promise that resolves when the database has been cleaned.
 */
async function dbCleaner(dataSource: DataSource): Promise<void> {
  const tableNamesRaw: Array<{ table_name: string }> = await dataSource.query(
    "SELECT table_name " +
      "FROM information_schema.tables " +
      "WHERE table_schema = 'public' " +
      "AND table_name <> 'migrations'",
  );

  if (!tableNamesRaw.length) {
    return;
  }

  const tableNames: string[] = tableNamesRaw.map((tableName): string => `"${tableName.table_name}"`);

  await dataSource.query("TRUNCATE " + tableNames.join(", ") + " RESTART IDENTITY CASCADE");
}

export { randomValidJwt, dbCleaner };
