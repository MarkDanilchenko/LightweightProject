import { Response } from "express";

/**
 * Sets a cookie in the response with the given name and value.
 * By default, cookie is marked as secure since Nginx terminates HTTPS for all client connections.
 * Can be overridden to `false` for local development or testing.
 *
 * @param {Response} res - The response object
 * @param {string} name - The name of the cookie
 * @param {unknown} value - The value of the cookie
 * @param {boolean} [secure=true] - Whether the cookie should only be sent over HTTPS
 *
 * @returns void
 */
function setCookie(res: Response, name: string, value: unknown, secure: boolean = true): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    secure,
  });
}

/**
 * Clears a cookie in the response with the given name.
 *
 * @param {Response} res - The response object
 * @param {string} name - The name of the cookie to clear
 *
 * @returns void
 */
function clearCookie(res: Response, name: string): void {
  res.clearCookie(name);
}

export { setCookie, clearCookie };
