import axios from "axios";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface";

@Injectable()
export default class KeycloakOIDCStrategy extends PassportStrategy(Strategy, "keycloakOIDC") {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["clientID"]>(
        "authConfiguration.keycloak.clientID",
      )!,
      clientSecret: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["clientSecret"]>(
        "authConfiguration.keycloak.clientSecret",
      )!,
      callbackURL: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["callbackURL"]>(
        "authConfiguration.keycloak.callbackURL",
      )!,
      authorizationURL: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["authUrl"]>(
        "authConfiguration.keycloak.authUrl",
      )!,
      tokenURL: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["idTokenUrl"]>(
        "authConfiguration.keycloak.idTokenUrl",
      )!,
      scope: ["openid", "profile", "email", "roles"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<void> {}
}
