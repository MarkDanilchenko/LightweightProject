import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-yandex";
import { Injectable } from "@nestjs/common";
import AuthService from "#server/auth/auth.service";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import UserEntity from "#server/users/users.entity";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";

@Injectable()
export default class YandexOAuth2Strategy extends PassportStrategy(Strategy, "yandexOAuth2") {
  private readonly authService: AuthService;

  constructor(configService: ConfigService, authService: AuthService) {
    super({
      clientID: configService.get<AppConfiguration["authConfiguration"]["yandex"]["clientID"]>(
        "authConfiguration.yandex.clientID",
      )!,
      clientSecret: configService.get<AppConfiguration["authConfiguration"]["yandex"]["clientSecret"]>(
        "authConfiguration.yandex.clientSecret",
      )!,
      callbackURL: configService.get<AppConfiguration["authConfiguration"]["yandex"]["callbackURL"]>(
        "authConfiguration.yandex.callbackURL",
      )!,

      // Experimental, because in Strategy there no scopes in passport-yandex;
      scope: ["login:email", "login:info", "login:avatar"],
    } as any);

    this.authService = authService;
  }

  /**
   * Validate the users during the Yandex OAuth2 strategy.
   *
   * @param {string} accessToken The access token received from Yandex
   * @param {string} refreshToken The refresh token received from Yandex
   * @param {Profile} profile The users profile received from Yandex
   * @param {(error: string | null, user: any) => void} done The callback for the validation result
   *
   * @returns {Promise<void>} A promise that resolves once the validation is complete
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: string | null, user: any) => void,
  ): Promise<void> {
    // Both accessToken and refreshToken are tokens from Yandex and not used in the app authentication flow;
    // Inner access and refresh tokens are configured by the app itself
    // for further access to the protected API endpoints;
    const { emails, photos, username } = profile;

    const email = emails && Array.isArray(emails) && emails[0] ? emails[0].value : undefined;
    if (!email) {
      return done("No email found", undefined);
    }

    try {
      const user: UserEntity = await this.authService.idPAuthentication(AuthenticationProvider.YANDEX, {
        firstName: undefined,
        lastName: undefined,
        username,
        email,
        avatarUrl: photos && Array.isArray(photos) && photos[0] ? photos[0].value : undefined,
      });

      done(null, user);
    } catch (error: unknown) {
      return done((error as Error).message, undefined);
    }
  }
}
