import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { Profile } from "./interfaces/auth.interface.js";
import { requestWithUser, signInCredentials } from "./types/auth.types.js";
import UserService from "../user/user.service.js";
import { setCookie } from "../utils/cookie.js";
import TokenService from "./token.service.js";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interface.js";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  private readonly https: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    this.https = configService.get<AppConfiguration["serverConfiguration"]["https"]>("serverConfiguration.https")!;
  }

  @Get("google/signin")
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
  async googleSignInRedirect(@Req() req: requestWithUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    const user = req.user;

    const credentials: signInCredentials = {
      provider: "google",
      username: user.username,
      email: user.email,
    };

    const { accessToken } = await this.authService.signIn(credentials);

    setCookie(res, "accessToken", accessToken, this.https);

    res.redirect("/");
  }

  @Get("profile")
  @ApiOperation({ summary: "User profile", description: "Get the user profile" })
  @UseGuards(AuthGuard("jwt"))
  async getProfile(@Req() req: requestWithUser): Promise<Profile> {
    const { userId, username, email, provider } = req.user;

    const profile: Profile = (await this.userService.findByPk(userId, {
      relations: ["authentications"],
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
        username,
        email,
        authentications: {
          provider,
        },
      },
    })) as unknown as Profile;

    return profile;
  }

  @Get("refresh")
  @ApiOperation({
    summary: "Refresh authentication",
    description: "The user will be re-authenticated with a new access token.",
  })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const accessToken: string = req.signedCookies?.accessToken || req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      throw new UnauthorizedException("Authentication failed. Token is not provided.");
    }

    const { accessToken: newAccessToken } = await this.tokenService.refreshAccessToken(accessToken);

    setCookie(res, "accessToken", newAccessToken, this.https);
  }

  // @Get("local/signin")
  // @ApiOperation({
  //   summary: "Local authentication",
  //   description: "The user will be authenticated locally with a username and password.",
  // })
  // @UseGuards(AuthGuard("local"))
  // async localSignIn(@Req() req: Request & { user: }): Promise<void> {}
}
