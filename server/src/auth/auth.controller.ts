import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import AuthService from "./auth.service.js";
import { Request, Response } from "express";
import { AuthCredentials } from "./interfaces/auth.interface.js";
import { Profile, requestWithUser } from "./types/auth.types.js";
import UserService from "../user/user.service.js";
import { setCookie } from "../utils/cookie.js";
import TokenService from "./token.service.js";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interface.js";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import JwtGuard from "./guards/jwt.guard.js";
import LocalAuthGuard from "./guards/local-auth.guard.js";
import GoogleAuthGuard from "./guards/google-auth.guard.js";
import { ProfileDto, SignInLocalDto, SignUpLocalDto } from "./dto/auth.dto.js";

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
  @ApiResponse({
    status: 302,
    description: "The user will be redirected to Google authentication form.",
  })
  @UseGuards(GoogleAuthGuard)
  async googleSignIn(): Promise<void> {
    // The request will be redirected to Google for further authentication;
    // Nothing more to do here;
  }

  @Get("google/redirect")
  @ApiOperation({
    summary: "Google authentication via OAuth2 (redirect)",
    description: "The user will be redirected to the home page of the web application after successful authentication.",
  })
  @ApiResponse({
    status: 302,
    description: "The user will be redirected to the home page of the web application.",
  })
  @ApiResponse({
    status: 400,
    description: "Authentication failed. Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed.",
  })
  @ApiResponse({
    status: 404,
    description: "Authentication failed. User not found.",
  })
  @UseGuards(GoogleAuthGuard)
  async googleSignInRedirect(@Req() req: requestWithUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    const user = req.user;

    const credentials: AuthCredentials = {
      provider: "google",
      email: user.email,
    };

    const { accessToken } = await this.authService.signIn(credentials);

    setCookie(res, "accessToken", accessToken, this.https);

    res.redirect("/");
  }

  @Get("profile")
  @ApiOperation({ summary: "User profile", description: "Get the user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile",
    type: ProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid request or user is not authenticated.",
  })
  @UseGuards(JwtGuard)
  async getProfile(@Req() req: requestWithUser): Promise<ProfileDto> {
    const { userId, username, email, provider } = req.user;

    const profile = (await this.userService.findByPk(userId, {
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
    })) as Profile | ProfileDto;

    return profile;
  }

  @Get("refresh")
  @ApiOperation({
    summary: "Refresh authentication",
    description: "The user will be re-authenticated with a new access token.",
  })
  @ApiResponse({
    status: 200,
    description: "The user will be re-authenticated with a new access token.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Token is not provided, not valid or user is not authenticated.",
  })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const accessToken = (req.signedCookies?.accessToken || req.headers.authorization?.split(" ")[1]) as string;

    if (!accessToken) {
      throw new UnauthorizedException("Authentication failed. Token is not provided.");
    }

    const { accessToken: newAccessToken } = await this.tokenService.refreshAccessToken(accessToken);

    setCookie(res, "accessToken", newAccessToken, this.https);
  }

  @Post("local/signup")
  @ApiOperation({
    summary: "Sign up with local authentication",
    description: "Create a new user with local authentication strategy.",
  })
  @ApiResponse({
    status: 201,
    description: "User created successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid credentials or user already exists.",
  })
  @ApiResponse({
    status: 401,
    description: "Sign up failed.",
  })
  @ApiBody({ type: SignUpLocalDto })
  @UsePipes(ZodValidationPipe)
  async localSignUp(@Body() signUpLocalDto: SignUpLocalDto): Promise<void> {
    await this.authService.authAccordingToStrategy("local", signUpLocalDto);
  }

  @Get("local/signin")
  @ApiOperation({
    summary: "Local authentication",
    description: "The user will be authenticated locally with a username and password.",
  })
  @ApiResponse({
    status: 302,
    description: "The user will be redirected to the home page of the web application after successful authentication.",
  })
  @ApiResponse({
    status: 400,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed.",
  })
  @ApiResponse({
    status: 404,
    description: "Authentication failed. User not found.",
  })
  @ApiBody({ type: SignInLocalDto })
  @UseGuards(LocalAuthGuard)
  async localSignIn(
    @Req() req: requestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Body() signInLocalDto: SignInLocalDto,
  ): Promise<void> {
    const user = req.user;

    const credentials: AuthCredentials = {
      provider: "local",
      email: user.email,
      password: signInLocalDto.password,
    };

    const { accessToken } = await this.authService.signIn(credentials);

    setCookie(res, "accessToken", accessToken, this.https);

    res.redirect("/");
  }
}
