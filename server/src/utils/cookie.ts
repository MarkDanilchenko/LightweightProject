import { Response } from "express";

function setCookie(res: Response, name: string, value: unknown, secure?: boolean): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "strict",
    signed: true,
    secure,
  });
}

export { setCookie };
