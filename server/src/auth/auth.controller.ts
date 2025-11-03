import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interfaces";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import AuthService from "@server/auth/auth.service";
import { LocalVerificationEmailDto, SignInLocalDto, SignUpLocalDto } from "@server/auth/dto/auth.dto";
import { setCookie } from "@server/utils/cookie";
import AuthLocalGuard from "@server/auth/guards/local.guard";
import { RequestWithUser } from "@server/auth/types/auth.types";
import UserEntity from "@server/user/user.entity";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  private readonly configService: ConfigService;
  private readonly authService: AuthService;
  private readonly https: boolean;

  constructor(configService: ConfigService, authService: AuthService) {
    this.configService = configService;
    this.authService = authService;
    this.https = configService.get<AppConfiguration["serverConfiguration"]["https"]>("serverConfiguration.https")!;
  }

  @Post("local/signup")
  @ApiOperation({
    summary: "Sign up with local authentication",
    description: "Create a new user with local authentication strategy. Email verification is required to proceed.",
  })
  @ApiResponse({
    status: 201,
    description: "User created successfully. Email verification is required to proceed.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid credentials or user already exists.",
  })
  @ApiBody({ type: SignUpLocalDto })
  @UsePipes(ZodValidationPipe)
  async localSignUp(@Body() signUpLocalDto: SignUpLocalDto): Promise<void> {
    await this.authService.localSignUp(signUpLocalDto);
  }

  @Get("local/verification/email")
  @ApiOperation({
    summary: "Verify email address",
    description: "Verify the User's email address during local sign up workflow.",
  })
  @ApiResponse({
    status: 302,
    description:
      "Redirect to the home client page (frontend-app) after successful email verification." +
      "If varification was failed - back to the sign in page.",
  })
  @ApiQuery({ type: LocalVerificationEmailDto })
  @UsePipes(ZodValidationPipe)
  async localVerificationEmail(
    @Query() localVerificationEmailDto: LocalVerificationEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    try {
      const { accessToken } = await this.authService.localVerificationEmail(localVerificationEmailDto);

      setCookie(res, "accessToken", accessToken, this.https);

      // TODO: should redirect to the home client page (frontend-app) after successful email verification;
      res.redirect(302, "/home");
    } catch (error: unknown) {
      const errorMsg: string = error instanceof Error ? error.message : "An unknown error occurred.";

      // TODO: should redirect to the sign in page (frontend-app) after failed email verification with error message in query;
      res.redirect(302, `/signin?errorMsg=${errorMsg}`);
    }
  }

  @Get("local/signin")
  @ApiOperation({
    summary: "Sign in with local authentication",
    description: "Sign in with local authentication strategy, using email or username and password.",
  })
  @ApiResponse({
    status: 200,
    description: "User signed in successfully.",
  })
  @ApiResponse({
    status: 401,
    description:
      "Authentication failed. " + "Invalid credentials or " + "user not found or " + "email is not verified.",
  })
  @ApiBody({ type: SignInLocalDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(AuthLocalGuard)
  async localSignIn(
    @Req() req: RequestWithUser,
    @Body() signInLocalDto: SignInLocalDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const user: UserEntity = req.user;

    const { accessToken } = await this.authService.localSignIn(user);

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authentication failed. " + "Invalid credentials or " + "user not found or " + "email is not verified.",
      );
    }

    setCookie(res, "accessToken", accessToken, this.https);
  }

  //   @Get("google/signin")
  //   @ApiOperation({
  //     summary: "Google authentication via OAuth2",
  //     description: "The user will be redirected to Google for further authentication.",
  //   })
  //   @ApiOAuth2(["email", "profile"], "googleOAuth2")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to Google authentication form.",
  //   })
  //   @UseGuards(GoogleAuthGuard)
  //   async googleSignIn(): Promise<void> {
  //     // The request will be redirected to Google for further authentication;
  //     // Nothing more to do here;
  //   }
  //
  //   @Get("google/redirect")
  //   @ApiOperation({
  //     summary: "Google authentication via OAuth2 (redirect)",
  //     description: "The user will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiOAuth2(["email", "profile"], "googleOAuth2")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to the home page of the web application.",
  //   })
  //   @ApiResponse({
  //     status: 400,
  //     description: "Authentication failed. Invalid request.",
  //   })
  //   @ApiResponse({
  //     status: 401,
  //     description: "Authentication failed.",
  //   })
  //   @ApiResponse({
  //     status: 404,
  //     description: "Authentication failed. User not found.",
  //   })
  //   @UseGuards(GoogleAuthGuard)
  //   async googleSignInRedirect(@Req() req: requestWithUser, @Res({ passthrough: true }) res: Response): Promise<void> {
  //     const user = req.user;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "google",
  //       email: user.email,
  //     };
  //
  //     const { accessToken } = await this.authService.signIn(credentials);
  //
  //     setCookie(res, "accessToken", accessToken, this.https);
  //
  //     res.redirect("/");
  //   }
  //
  //   @Get("keycloak/signin")
  //   @ApiOperation({
  //     summary: "Keycloak authentication via OAuth2(OIDC)",
  //     description: "The user will be redirected to Keycloak for further authentication.",
  //   })
  //   @ApiOAuth2(["profile", "email"], "keycloakOAuth2OIDC")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to Keycloak authentication form.",
  //   })
  //   @UseGuards(KeycloakAuthGuard)
  //   async keycloakSignIn(): Promise<void> {
  //     // The request will be redirected to Keycloak for further authentication;
  //     // Nothing more to do here;
  //   }
  //
  //   @Get("keycloak/redirect")
  //   @ApiOperation({
  //     summary: "Keycloak authentication via OAuth2(OIDC) (redirect)",
  //     description: "The user will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiOAuth2(["profile", "email"], "keycloakOAuth2OIDC")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to the home page of the web application.",
  //   })
  //   @ApiResponse({
  //     status: 400,
  //     description: "Authentication failed. Invalid request.",
  //   })
  //   @ApiResponse({
  //     status: 401,
  //     description: "Authentication failed.",
  //   })
  //   @ApiResponse({
  //     status: 404,
  //     description: "Authentication failed. User not found.",
  //   })
  //   @UseGuards(KeycloakAuthGuard)
  //   async keycloakSignInRedirect(@Req() req: requestWithUser, @Res({ passthrough: true }) res: Response): Promise<void> {
  //     const user = req.user;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "keycloak",
  //       email: user.email,
  //     };
  //
  //     const { accessToken } = await this.authService.signIn(credentials);
  //
  //     setCookie(res, "accessToken", accessToken, this.https);
  //
  //     res.redirect("/");
  //   }
  //
  //   @Get("keycloak/saml/signin")
  //   @ApiOperation({
  //     summary: "Keycloak authentication via SAML",
  //     description: "The user will be redirected to Keycloak for further authentication.",
  //   })
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to Keycloak authentication form.",
  //   })
  //   @UseGuards(KeycloakSAMLAuthGuard)
  //   async keycloakSamlSignIn(): Promise<void> {
  //     // The request will be redirected to Keycloak for further authentication;
  //     // Nothing more to do here;
  //   }
  //
  //   @Post("keycloak/saml/redirect")
  //   @ApiOperation({
  //     summary: "Keycloak authentication via SAML (redirect)",
  //     description: "The user will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiResponse({
  //     status: 302,
  //     description: "The user will be redirected to the home page of the web application.",
  //   })
  //   @ApiResponse({
  //     status: 400,
  //     description: "Authentication failed. Invalid request.",
  //   })
  //   @ApiResponse({
  //     status: 401,
  //     description: "Authentication failed.",
  //   })
  //   @ApiResponse({
  //     status: 404,
  //     description: "Authentication failed. User not found.",
  //   })
  //   @UseGuards(KeycloakSAMLAuthGuard)
  //   async keycloakSamlSignInRedirect(
  //     @Req() req: requestWithUser,
  //     @Res({ passthrough: true }) res: Response,
  //   ): Promise<void> {
  //     const user = req.user;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "keycloak",
  //       email: user.email,
  //     };
  //
  //     const { accessToken } = await this.authService.signIn(credentials);
  //
  //     setCookie(res, "accessToken", accessToken, this.https);
  //
  //     res.redirect("/");
  //   }
  //
  //   @Get("profile")
  //   @ApiOperation({ summary: "User profile", description: "Get the user profile" })
  //   @ApiCookieAuth("accessToken")
  //   @ApiResponse({
  //     status: 200,
  //     description: "User profile",
  //     type: ProfileDto,
  //   })
  //   @ApiResponse({
  //     status: 401,
  //     description: "Authentication failed. Invalid request or user is not authenticated.",
  //   })
  //   @UseGuards(JwtGuard)
  //   async getProfile(@Req() req: requestWithUser): Promise<ProfileDto> {
  //     const { userId, username, email, provider } = req.user;
  //
  //     const profile = (await this.userService.findByPk(userId, {
  //       relations: ["authentications"],
  //       select: {
  //         id: true,
  //         username: true,
  //         firstName: true,
  //         lastName: true,
  //         email: true,
  //         avatarUrl: true,
  //         createdAt: true,
  //         updatedAt: true,
  //         authentications: {
  //           id: true,
  //           provider: true,
  //           lastAccessedAt: true,
  //         },
  //       },
  //       where: {
  //         username,
  //         email,
  //         authentications: {
  //           provider,
  //         },
  //       },
  //     })) as Profile | ProfileDto;
  //
  //     return profile;
  //   }
  //
  //   @Get("refresh")
  //   @ApiOperation({
  //     summary: "Refresh authentication",
  //     description: "The user will be re-authenticated with a new access token.",
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: "The user will be re-authenticated with a new access token.",
  //   })
  //   @ApiResponse({
  //     status: 401,
  //     description: "Authentication failed. Token is not provided, not valid or user is not authenticated.",
  //   })
  //   @ApiCookieAuth("accessToken")
  //   async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
  //     const accessToken = (req.signedCookies?.accessToken || req.headers.authorization?.split(" ")[1]) as string;
  //
  //     if (!accessToken) {
  //       throw new UnauthorizedException("Authentication failed. Token is not provided.");
  //     }
  //
  //     const { accessToken: newAccessToken } = await this.tokenService.refreshAccessToken(accessToken);
  //
  //     setCookie(res, "accessToken", newAccessToken, this.https);
  //   }
}
