import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, VerifyCallback } from "passport-google-oauth20";
import { AppConfiguration } from "@server/configs/interfaces/appConfiguration.interface";
import { ConfigService } from "@nestjs/config";
import AuthService from "../auth.service.js";
import GoogleOAuth2Strategy from "../interfaces/googleoauth2strategy.interface.js";

@Injectable()
export default class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    // eslint-disable-next-line no-unused-vars
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
      scope: ["email", "profile"],
    });
  }

  /**
   * Returns the authorization parameters for the Google OAuth strategy.
   *
   * @returns An object containing the access type and prompt settings.
   */
  authorizationParams(): GoogleOAuth2Strategy["authorizationParams"] {
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
    const userProvider: string = profile.provider;
    const userProfile: GoogleOAuth2Strategy["userProfile"] = {
      firstName: profile._json.given_name,
      lastName: profile._json.family_name,
      email: profile._json.email,
      avatarUrl: profile._json.picture,
    };
    const userTokens: GoogleOAuth2Strategy["userTokens"] = {
      accessToken,
      refreshToken,
    };

    const user = await this.authService.validateUser(userProvider, userProfile, userTokens);

    done(null, user);
  }
}
