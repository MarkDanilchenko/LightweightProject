/**
 * Generates a static JWT token for testing purposes, that contains the following payload:
 * {
 *   "sub": "1234567890",
 *   "name": "John Doe",
 *   "admin": true,
 *   "iat": 1516239022
 * }
 *
 * @returns {string} A pre-defined JWT token that can be used in test cases.
 */
function randomValidJwt(): string {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";
}

/**
 * Generates a JWT token for testing purposes, that is not valid.
 *
 * @returns {string} A JWT token that can be used in test cases.
 */
function notValidJwt(): string {
  return randomValidJwt() + ".invalid";
}

export { randomValidJwt, notValidJwt };
