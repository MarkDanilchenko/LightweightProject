import { Response } from "express";

/**
 * Sets a cookie in the response with the given name and value.
 *
 * @param res - The response object
 * @param name - The name of the cookie
 * @param value - The value of the cookie
 * @param secure - Whether the cookie should only be sent over HTTPS (default: true)
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

export { setCookie };
