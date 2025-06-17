import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth() {
    // The request will be redirected to Google for further authentication;
    // Nothing more to do here;
  }

  @Get("google/redirect")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    console.log("🚀 ~ AuthController ~ googleAuthRedirect ~ REQ:", req);
    console.log("🚀 ~ AuthController ~ googleAuthRedirect ~ RES:", res);
  }
}
