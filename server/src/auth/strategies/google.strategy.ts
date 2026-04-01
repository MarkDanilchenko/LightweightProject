import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import AuthService from "@server/auth/auth.service";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

@Injectable()
export default class GoogleOAuth2Strategy extends PassportStrategy(Strategy, "googleOAuth2") {
  private readonly configService: ConfigService;
  private readonly authService: AuthService;

  constructor(configService: ConfigService, authService: AuthService) {
    super({
      clientID: configService.get<AppConfiguration["authConfiguration"]["google"]["clientID"]>(
        "authConfiguration.google.clientID",
      )!,
      clientSecret: configService.get<AppConfiguration["authConfiguration"]["google"]["clientSecret"]>(
        "authConfiguration.google.clientSecret",
      )!,
      callbackURL: configService.get<AppConfiguration["authConfiguration"]["google"]["callbackURL"]>(
        "authConfiguration.google.callbackURL",
      )!,

      // For OAuth2 the scope does not contain the `openid` consent;
      // For OIDC scope: ['openid', 'email', 'profile'];
      scope: ["email", "profile"],
    });
  }

  //   /**
  //    * Returns the additional authorization parameters for the Google OAuth2 strategy.
  //    * This is needed for returning the refresh token while consent is accepted and related users info is received at first time.
  //    *
  //    * @returns An object containing the access type and prompt settings.
  //    */
  //   authorizationParams(): GoogleOAuth2["authorizationParams"] {
  //     return {
  //       access_type: "offline",
  //       prompt: "consent",
  //     };
  //   }

  /**
   * Validate the users during the Google OAuth2 strategy.
   *
   * @param {string} accessToken The access token received from Google
   * @param {string} refreshToken The refresh token received from Google
   * @param {Profile} profile The users profile received from Google
   * @param {VerifyCallback} done The callback for the validation result
   *
   * @returns {Promise<void>} A promise that resolves once the validation is complete
   */
  async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
    // Both accessToken and refreshToken are tokens from Google, and are not used in the authentication flow;
    // Inner access and refresh tokens are configured by the application itself for further access to the protected API;
    const { name, given_name, family_name, email, picture } = profile._json;
    if (!email) {
      return done(new UnauthorizedException("Email is required"), undefined);
    }

    try {
      const user = await this.authService.idPAuthentication(AuthenticationProvider.GOOGLE, {
        username: name,
        firstName: given_name,
        lastName: family_name,
        email,
        avatarUrl: picture,
      });

      if (!user) {
        return done(
          new UnauthorizedException("Failed to authenticate with Google: user could not be created or updated"),
          undefined,
        );
      }

      done(null, user);
    } catch (error: unknown) {
      return done(new UnauthorizedException((error as Error).message), undefined);
    }
  }
}
