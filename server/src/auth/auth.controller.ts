import { Controller, Get, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import UserEntity from "@server/user/user.entity";

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
    const user = req.user as UserEntity;

    if (!user) {
      throw new UnauthorizedException("Authentication failed.");
    }

    const { accessToken } = await this.authService.signIn(user, "google");

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
    });

    // Redirect to the home page of the web application;
    res.redirect("/");
  }
}
