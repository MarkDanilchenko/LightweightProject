import * as jwt from "jsonwebtoken";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { faker } from "@faker-js/faker";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

const testSecretOrPrivateKey = "aFEo3Q8YBou-secretJwtKeyForTesting-FzM1sHSsEF3";

/**
 * Generates random valid JWT token for testing purposes.
 * @param {TokenPayload} [payload] - The payload to be used in the token.
 * @param {JwtSignOptions} [options] - The options to be used in the token.
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
  secretOrPrivateKey: string = testSecretOrPrivateKey,
): string {
  return jwt.sign(payload, secretOrPrivateKey, options);
}

export { randomValidJwt };
