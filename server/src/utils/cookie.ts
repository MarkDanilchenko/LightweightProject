import { Response } from "express";

/**
 * Sets a cookie in the response with the given name and value.
 *
 * @param {Response} res - The response object
 * @param {string} name - The name of the cookie
 * @param {unknown} value - The value of the cookie
 * @param {boolean} [secure] - Whether the cookie should only be sent over HTTPS (default: true)
 *
 * @returns void
 */
function setCookie(res: Response, name: string, value: unknown, secure?: boolean): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    secure: secure ?? true,
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
