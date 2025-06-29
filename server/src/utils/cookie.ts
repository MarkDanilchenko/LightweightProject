import { Response } from "express";

function setCookie(res: Response, name: string, value: unknown) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "strict",
    signed: true,
    // secure: true,
  });
}

export { setCookie };
