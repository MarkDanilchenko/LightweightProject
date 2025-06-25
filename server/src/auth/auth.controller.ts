import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import UserEntity from "@server/user/user.entity";
import { Profile, UserInfoAfterJwtAuthGuard } from "./interfaces/auth.interface.js";
import { signInCredentials } from "./types/auth.types.js";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("signin/google")
  @ApiOperation({
    summary: "Google authentication via OAuth2",
    description: "The user will be redirected to Google for further authentication.",
  })
  @UseGuards(AuthGuard("google"))
  async googleSignIn(): Promise<void> {
    // The request will be redirected to Google for further authentication;
    // Nothing more to do here;
  }

  @Get("google/redirect")
  @ApiOperation({
    summary: "Google authentication via OAuth2 (redirect)",
    description: "The user will be redirected to the home page of the web application after successful authentication.",
  })
  @UseGuards(AuthGuard("google"))
  async googleSignInRedirect(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const user = req.user as UserEntity;

    if (!user) {
      throw new UnauthorizedException("Authentication via Google failed.");
    }

    const credentials: signInCredentials = {
      provider: "google",
      username: user.username,
      email: user.email,
    };

    const { accessToken } = await this.authService.signIn(credentials);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
    });

    // Redirect to the home page of the web application;
    res.redirect("/");
  }

  @Get("profile")
  @ApiOperation({ summary: "User profile", description: "Get the user profile" })
  @UseGuards(AuthGuard("jwt"))
  async getProfile(@Req() req: Request & { user: UserInfoAfterJwtAuthGuard }): Promise<Profile> {
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
        email: userPartialInfo.email,
        username: userPartialInfo.username,
        authentications: { provider: userPartialInfo.provider },
      },
      relations: ["authentications"],
    })) as unknown as Profile;

    return profile;
  }

  @Get("signin/local")
  @ApiOperation({
    summary: "Local authentication",
    description: "The user will be authenticated locally with a username and password.",
  })
  @UseGuards(AuthGuard("local"))
  async localSignIn(): Promise<void> {}
}
