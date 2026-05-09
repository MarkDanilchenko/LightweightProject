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
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery, ApiCookieAuth, ApiOAuth2 } from "@nestjs/swagger";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interfaces";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import AuthService from "#server/auth/auth.service";
import {
  LocalEmailVerificationDto,
  LocalSignInDto,
  LocalSignUpDto,
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
} from "#server/auth/dto/auth.dto";
import { clearCookie, setCookie } from "#server/utils/cookie";
import LocalAuthGuard from "#server/auth/guards/local.guard";
import UserEntity from "#server/users/users.entity";
import JwtGuard from "#server/auth/guards/jwt.guard";
import { RequestWithSignedCookies, RequestWithTokenPayload, RequestWithUser } from "#server/common/types/common.types";
import { TokenPayload } from "#server/tokens/interfaces/token.interfaces";
import GoogleOAuth2Guard from "#server/auth/guards/google.guard";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";

@ApiTags("auth")
@Controller("auth")
export default class AuthController {
  private readonly authService: AuthService;
  private readonly https: boolean;

  constructor(configService: ConfigService, authService: AuthService) {
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
  @ApiBody({ type: LocalSignUpDto })
  @UsePipes(ZodValidationPipe)
  async localSignUp(@Body() localSignUpDto: LocalSignUpDto): Promise<void> {
    await this.authService.localSignUp(localSignUpDto);
  }

  @Get("local/email-verification/confirm")
  @ApiOperation({
    summary: "Verify email for local authentication",
    description: "Verify the User's email during local sign up workflow and set accessToken in cookie.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Email verification was successful." +
      "If varification was failed - redirect back to the client with error message.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid token.",
  })
  @ApiResponse({
    status: 404,
    description: "Authentication not found.",
  })
  @ApiQuery({ type: LocalEmailVerificationDto })
  @UsePipes(ZodValidationPipe)
  async localEmailVerification(
    @Query() localEmailVerificationDto: LocalEmailVerificationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken = await this.authService.localEmailVerification(localEmailVerificationDto);

    setCookie(res, "accessToken", accessToken, this.https);

    res.status(200).send();
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
    description: "Invalid credentials, authentication not found or email is not verified.",
  })
  @ApiBody({ type: LocalSignInDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(LocalAuthGuard)
  async localSignIn(
    @Req() req: RequestWithUser,
    @Body() localSignInDto: LocalSignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken = await this.authService.signIn(req.user, AuthenticationProvider.LOCAL);

    setCookie(res, "accessToken", accessToken, this.https);

    res.status(200).send();
  }

  @Get("local/reactivation/confirm")
  @ApiOperation({
    summary: "Confirm reactivation",
    description:
      "Confirm reactivation for a user account that has been deactivated (local authentication flow) and " +
      "set accessToken in cookie.",
  })
  @ApiResponse({
    status: 200,
    description: "Reactivation confirmed successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid token or email is not verified.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiQuery({ type: LocalReactivationConfirmDto })
  @UsePipes(ZodValidationPipe)
  async localReactivationConfirm(
    @Query() localReactivationConfirmDto: LocalReactivationConfirmDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken = await this.authService.localReactivationConfirm(localReactivationConfirmDto);

    setCookie(res, "accessToken", accessToken, this.https);

    res.status(200).send();
  }

  @Post("local/password-reset/request")
  @ApiOperation({
    summary: "Reset password request",
    description: "Generating a temporary token and sending a link to the mail for the further password reset.",
  })
  @ApiResponse({
    status: 200,
    description: "Password reset link sent successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Email is not verified.",
  })
  @ApiBody({ type: LocalPasswordResetRequestDto })
  @UsePipes(ZodValidationPipe)
  async localPasswordResetRequest(
    @Body() localPasswordResetRequestDto: LocalPasswordResetRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // TODO: user can use this route many times at once, it is not good, so should thin about some kind of debounce;
    await this.authService.localPasswordResetRequest(localPasswordResetRequestDto);

    res.status(200).send();
  }

  @Post("local/password-reset/confirm")
  @ApiOperation({
    summary: "Reset password confirmation",
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
  @ApiResponse({
    status: 401,
    description: "Invalid token or email is not verified.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiBody({ type: LocalPasswordResetConfirmDto })
  @UsePipes(ZodValidationPipe)
  async localPasswordResetConfirm(
    @Body() localPasswordResetConfirmDto: LocalPasswordResetConfirmDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.localPasswordResetConfirm(localPasswordResetConfirmDto);

    res.status(200).send();
  }

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
    description: "Invalid token.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async signOut(@Req() req: RequestWithTokenPayload, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.signOut(req.tokenPayload);

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
    description: "Invalid token.",
  })
  @ApiCookieAuth("accessToken")
  async refreshAccessToken(
    @Req() req: RequestWithSignedCookies & { headers: { authorization: string | undefined } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const accessToken: string = req.signedCookies.accessToken || req.headers["authorization"]?.split(" ")[1] || "";
    if (!accessToken) {
      throw new UnauthorizedException("Token is not provided.");
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
    description: "Invalid token.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async me(@Req() req: RequestWithTokenPayload): Promise<Partial<UserEntity>> {
    const payload: TokenPayload = req.tokenPayload;

    return this.authService.retrieveProfile(payload.userId);
  }

  @Get("google/signin")
  @ApiOperation({
    summary: "OAuth2 Google authentication.",
    description: "Users will be redirected to Google for OAuth2 authentication.",
  })
  @ApiResponse({
    status: 302,
    description: "The users will be redirected to Google authentication form.",
  })
  @ApiOAuth2(["email", "profile"], "googleOAuth2")
  @UseGuards(GoogleOAuth2Guard)
  async googleSignIn(): Promise<void> {
    // Nothing more to do here;
  }

  @Get("google/redirect")
  @ApiOperation({
    summary: "OAuth2 Google authentication",
    description:
      "User will be redirected the home page of the web application after successful authentication within idp service.",
  })
  @ApiResponse({
    status: 200,
    description: "User is authenticated via Google successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid token or authentication not found.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiOAuth2(["email", "profile"], "googleOAuth2")
  @UseGuards(GoogleOAuth2Guard)
  async googleRedirect(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    const accessToken = await this.authService.signIn(req.user, AuthenticationProvider.GOOGLE);

    setCookie(res, "accessToken", accessToken, this.https);

    res.status(200).send();
  }

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
