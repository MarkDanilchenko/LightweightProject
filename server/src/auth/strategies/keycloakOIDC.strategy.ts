import * as fs from "fs";
import * as https from "https";
import axios from "axios";
import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-oauth2";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface";
import { AuthAccordingToStrategyOptions, KeycloakOAuth2OIDC } from "../interfaces/auth.interface.js";
import { AuthenticationProvider } from "../types/auth.types.js";
import AuthService from "../auth.service.js";

@Injectable()
export default class KeycloakOAuth2OIDCStrategy extends PassportStrategy(Strategy, "keycloakOAuth2OIDC") {
  private readonly logger: LoggerService;
  private readonly userInfoUrl: string;
  private httpsAgent: https.Agent;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
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

      // scope: ["email", "openid"],
      // scope: ["profile", "email", "openid"],
    });

    this.logger = new Logger(KeycloakOAuth2OIDCStrategy.name);
    this.userInfoUrl = configService.get<AppConfiguration["authConfiguration"]["keycloak"]["userInfoUrl"]>(
      "authConfiguration.keycloak.userInfoUrl",
    )!;

    // LEARN: for https we need to set the CA in https.Agent directly,
    // LEARN: because nodejs can not recognize leaf authority from self-signed mkcert certificate from keycloak;
    fs.readFile("../certs/rootCA.pem", (err, ca) => {
      if (err) throw err;

      this.httpsAgent = new https.Agent({
        ca,
      });

      this._oauth2.setAgent(this.httpsAgent);
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<void> {
    // LEARN: passport-oauth2 is not capable of getting the user profile;
    // LEARN: so we will call the axios request to the user profile separately;
    try {
      const {
        data: response,
      }: {
        data: KeycloakOAuth2OIDC["defaultScope"] &
          KeycloakOAuth2OIDC["emailScope"] &
          KeycloakOAuth2OIDC["profileScope"];
      } = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        httpsAgent: this.httpsAgent,
      });
      console.log("🚀 ~ KeycloakOAuth2OIDCStrategy ~ validate ~ response:", response);

      // const idP: AuthenticationProvider = (response.provider as AuthenticationProvider) ?? "keycloak";
      const userInfo: KeycloakOAuth2OIDC["userInfo"] = {
        firstName: response.given_name,
        lastName: response.family_name,
        email: response.email,
        avatarUrl: response.avatarUrl,
      };
      const idPTokens: AuthAccordingToStrategyOptions = {
        accessToken,
        refreshToken,
      };

      return;

      // const user = await this.authService.authAccordingToStrategy(idP, userInfo, idPTokens);

      // done(null, user!);
    } catch (error) {
      this.logger.error("🚀 ~ KeycloakOIDCStrategy ~ validate ~ error:", error);

      done(error, false);
    }
  }
}
