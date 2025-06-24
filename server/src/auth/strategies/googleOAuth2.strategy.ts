import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface";
import { ConfigService } from "@nestjs/config";
import AuthService from "../auth.service.js";
import GoogleOAuth2 from "../interfaces/googleOAuth2.interface.js";

@Injectable()
export default class GoogleOAuth2Strategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
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
      // LEARN For OAuth 2.0, the scope does not contain the `openid` scope !!!
      // LEARN For OIDC the scope looks like: scope: ['openid', 'email', 'profile'];
      scope: ["email", "profile"],
    });
  }

  /**
   * Returns the authorization parameters for the Google OAuth strategy.
   * This is needed for returning the refresh token while consent is accepted and related info is received at first time.
   *
   * @returns An object containing the access type and prompt settings.
   */
  authorizationParams(): GoogleOAuth2["authorizationParams"] {
    return {
      access_type: "offline",
      prompt: "consent",
    };
  }

  /**
   * Validate the user using the Google OAuth strategy.
   *
   * @param accessToken The access token received from Google.
   * @param refreshToken The refresh token received from Google.
   * @param profile The user profile received from Google.
   * @param done The callback for the validation result.
   *
   * @returns A promise that resolves with `void` once the validation is complete.
   */
  async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
    const idP = profile.provider;
    const userProfile: GoogleOAuth2["userProfile"] = {
      userName: profile._json.name!,
      firstName: profile._json.given_name,
      lastName: profile._json.family_name,
      email: profile._json.email!,
      avatarUrl: profile._json.picture,
    };
    const userIdPTokens: GoogleOAuth2["userIdPTokens"] = {
      accessToken,
      refreshToken,
    };

    const user = await this.authService.authAccordingToStrategy(idP, userProfile, userIdPTokens);

    done(null, user);
  }
}
