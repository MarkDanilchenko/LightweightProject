import { Controller, Get, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import UserEntity from "@server/user/user.entity";
import JwtAuthGuard from "./guards/jwt-auth.guard.js";
import { Profile, UserInfoByJwtAuthGuard } from "./interfaces/auth.interface.js";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("google")
  @ApiOperation({ summary: "Google OAuth2 authentication" })
  @UseGuards(AuthGuard("google"))
  async googleAuth(): Promise<void> {
    // The request will be redirected to Google for further authentication;
    // Nothing more to do here;
  }

  @Get("google/redirect")
  @ApiOperation({ summary: "Google OAuth2 authentication redirect" })
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
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

  @Get("profile")
  @ApiOperation({ summary: "Get user profile info" })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request & { user: UserInfoByJwtAuthGuard }): Promise<Profile> {
    const userPartialInfo = req.user;

    const profile = (await UserEntity.findOne({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        authentications: {
          id: true,
          provider: true,
          lastAccessedAt: true,
        },
      },
      where: {
        id: userPartialInfo.id,
        email: userPartialInfo.email,
        username: userPartialInfo.username,
        authentications: { provider: userPartialInfo.idp },
      },
      relations: ["authentications"],
    })) as unknown as Profile;

    return profile;
  }
}
