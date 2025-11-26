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
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery, ApiCookieAuth } from "@nestjs/swagger";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interfaces";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import AuthService from "@server/auth/auth.service";
import {
  LocalVerificationEmailDto,
  LocalSignInDto,
  LocalSignUpDto,
  LocalForgotPasswordDto,
  LocalResetPasswordDto,
} from "@server/auth/dto/auth.dto";
import { clearCookie, setCookie } from "@server/utils/cookie";
import LocalAuthGuard from "@server/auth/guards/local.guard";
import UserEntity from "@server/users/users.entity";
import JwtGuard from "@server/auth/guards/jwt.guard";
import { RequestWithSignedCookies, RequestWithTokenPayload, RequestWithUser } from "@server/common/types/common.types";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  private readonly configService: ConfigService;
  private readonly authService: AuthService;
  private readonly https: boolean;
  private readonly clientBaseUrl: string;

  constructor(configService: ConfigService, authService: AuthService) {
    this.configService = configService;
    this.authService = authService;
    this.https = configService.get<AppConfiguration["serverConfiguration"]["https"]>("serverConfiguration.https")!;
    this.clientBaseUrl =
      configService.get<AppConfiguration["clientConfiguration"]["baseUrl"]>("clientConfiguration.baseUrl")!;
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
  @ApiBody({ type: LocalSignUpDto })
  @UsePipes(ZodValidationPipe)
  async localSignUp(@Body() localSignUpDto: LocalSignUpDto): Promise<void> {
    await this.authService.localSignUp(localSignUpDto);
  }

  @Post("local/verification/email")
  @ApiOperation({
    summary: "Verify email for local authentication",
    description: "Verify the User's email during local sign up workflow.",
  })
  @ApiResponse({
    status: 302,
    description:
      "Redirect to the home client page (frontend-app) after successful email verification." +
      "If varification was failed - redirect back to the sign in page.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
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
      res.redirect(302, `${this.clientBaseUrl}/home`);
    } catch (error: unknown) {
      const errorMsg: string = error instanceof Error ? error.message : "An unknown error occurred.";

      // TODO: should redirect to the sign in page (frontend-app) after failed email verification with error message in query;
      res.redirect(302, `${this.clientBaseUrl}/signin?errorMsg=${errorMsg}`);
    }
  }

  @Post("local/signin")
  @ApiOperation({
    summary: "Sign in with local authentication",
    description: "Sign in with local authentication strategy, using email or username and password.",
  })
  @ApiResponse({
    status: 200,
    description: "User signed in successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. " + "Invalid credentials or " + "email is not verified.",
  })
  @ApiBody({ type: LocalSignInDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(LocalAuthGuard)
  async localSignIn(
    @Req() req: RequestWithUser,
    @Body() localSignInDto: LocalSignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const user: UserEntity = req.user;

    const { accessToken } = await this.authService.localSignIn(user);

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authentication failed. " + "Invalid credentials or " + "users not found or " + "email is not verified.",
      );
    }

    setCookie(res, "accessToken", accessToken, this.https);

    res.status(200).send();
  }

  @Post("local/password/forgot")
  @ApiOperation({
    summary: "Forgot password",
    description: "Generating a temporary token and sending a link to the mail for the further password reset.",
  })
  @ApiResponse({
    status: 200,
    description: "Email with temporary generated token was sent successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiBody({ type: LocalForgotPasswordDto })
  @UsePipes(ZodValidationPipe)
  async forgotPassword(@Body() localForgotPasswordDto: LocalForgotPasswordDto): Promise<void> {}

  @Post("local/password/reset")
  @ApiOperation({
    summary: "Reset password",
    description: "Resetting the password using the temporary token.",
  })
  @ApiResponse({
    status: 200,
    description: "Password was reset successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiBody({ type: LocalResetPasswordDto })
  @UsePipes(ZodValidationPipe)
  async resetPassword(@Body() localResetPasswordDto: LocalResetPasswordDto): Promise<void> {}

  @Post("signout")
  @ApiOperation({
    summary: "Sign out",
    description: "Sign out and clear both access & refresh tokens.",
  })
  @ApiResponse({
    status: 200,
    description: "User signed out successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async signOut(@Req() req: RequestWithTokenPayload, @Res({ passthrough: true }) res: Response): Promise<void> {
    const payload: TokenPayload = req.tokenPayload;

    await this.authService.signOut(payload);

    clearCookie(res, "accessToken");

    res.status(200).send();
  }

  @Post("refresh")
  @ApiOperation({
    summary: "Refresh access token",
    description: "Refresh access token using related to the user refresh token in database.",
  })
  @ApiResponse({
    status: 200,
    description: "Access token refreshed successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiCookieAuth("accessToken")
  async refreshAccessToken(
    @Req() req: RequestWithSignedCookies & { headers: { authorization: string | undefined } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken: string = req.signedCookies.accessToken || req.headers["authorization"]?.split(" ")[1] || "";
    if (!accessToken) {
      throw new UnauthorizedException("Authentication failed. Token is not provided.");
    }

    const { accessToken: newAccessToken } = await this.authService.refreshAccessToken(accessToken);

    setCookie(res, "accessToken", newAccessToken, this.https);

    res.status(200).send();
  }

  @Get("me")
  @ApiOperation({
    summary: "Profile",
    description: "Get current user's profile.",
  })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async me(@Req() req: RequestWithTokenPayload): Promise<Partial<UserEntity>> {
    const payload: TokenPayload = req.tokenPayload;

    return this.authService.retrieveProfile(payload.userId);
  }

  //   @Get("google/signin")
  //   @ApiOperation({
  //     summary: "Google authentication via OAuth2",
  //     description: "The users will be redirected to Google for further authentication.",
  //   })
  //   @ApiOAuth2(["email", "profile"], "googleOAuth2")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to Google authentication form.",
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
  //     description: "The users will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiOAuth2(["email", "profile"], "googleOAuth2")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to the home page of the web application.",
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
  //     const users = req.users;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "google",
  //       email: users.email,
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
  //     description: "The users will be redirected to Keycloak for further authentication.",
  //   })
  //   @ApiOAuth2(["profile", "email"], "keycloakOAuth2OIDC")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to Keycloak authentication form.",
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
  //     description: "The users will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiOAuth2(["profile", "email"], "keycloakOAuth2OIDC")
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to the home page of the web application.",
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
  //     const users = req.users;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "keycloak",
  //       email: users.email,
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
  //     description: "The users will be redirected to Keycloak for further authentication.",
  //   })
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to Keycloak authentication form.",
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
  //     description: "The users will be redirected to the home page of the web application after successful authentication.",
  //   })
  //   @ApiResponse({
  //     status: 302,
  //     description: "The users will be redirected to the home page of the web application.",
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
  //     const users = req.users;
  //
  //     const credentials: AuthCredentials = {
  //       provider: "keycloak",
  //       email: users.email,
  //     };
  //
  //     const { accessToken } = await this.authService.signIn(credentials);
  //
  //     setCookie(res, "accessToken", accessToken, this.https);
  //
  //     res.redirect("/");
  //   }
}
