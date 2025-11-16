// import * as fs from "fs";
// import { Injectable, Logger, LoggerService } from "@nestjs/common";
// import { ConfigService } from "@nestjs/config";
// import { PassportStrategy } from "@nestjs/passport";
// import { Profile, Strategy, VerifiedCallback } from "@node-saml/passport-saml";
// import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface";
// import { AuthenticationProvider } from "../types/auth.types.js";
// import { KeycloakSAML } from "../interfaces/auth.interface.js";
// import AuthService from "../auth.service.js";
// import { instanceToPlain } from "class-transformer";
//
// @Injectable()
// export default class KeycloakSAMLStrategy extends PassportStrategy(Strategy, "keycloakSAML") {
//   private readonly logger: LoggerService;
//
//   constructor(
//     private readonly configService: ConfigService,
//     private readonly authService: AuthService,
//   ) {
//     super(
//       {
//         privateKey: fs.readFileSync("../certs/kc-signin-key.key", {
//           encoding: "utf-8",
//           flag: "r",
//         }),
//         // decryptionPvk: fs.readFileSync("../certs/kc-encrypt-key.key", {
//         //   encoding: "utf-8",
//         //   flag: "r",
//         // }),
//         signatureAlgorithm: "sha256",
//         digestAlgorithm: "sha256",
//         acceptedClockSkewMs: 10000,
//         passReqToCallback: true,
//         idpCert: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["saml"]["idpCert"]>(
//           "authConfiguration.keycloak.saml.idpCert",
//         )!,
//         issuer: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["saml"]["issuer"]>(
//           "authConfiguration.keycloak.saml.issuer",
//         )!,
//         callbackUrl: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["saml"]["callbackUrl"]>(
//           "authConfiguration.keycloak.saml.callbackUrl",
//         )!,
//         entryPoint: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["saml"]["entryPoint"]>(
//           "authConfiguration.keycloak.saml.entryPoint",
//         )!,
//       },
//       (req: any, profile: (Profile & { attributes: KeycloakSAML }) | null, done: VerifiedCallback) =>
//         this.validate(req, profile, done),
//     );
//
//     this.logger = new Logger(KeycloakSAMLStrategy.name);
//   }
//
//   async validate(
//     req: any,
//     profile: (Profile & { attributes: KeycloakSAML }) | null,
//     done: VerifiedCallback,
//   ): Promise<void> {
//     try {
//       const idP: AuthenticationProvider = "keycloak";
//
//       if (!profile) {
//         new Error("SAML profile is not defined");
//       }
//
//       const userInfo: KeycloakSAML = {
//         userName: profile!.attributes.email,
//         firstName: profile!.attributes.firstName,
//         lastName: profile!.attributes.lastName,
//         email: profile!.attributes.email,
//         avatarUrl: profile!.attributes.avatarUrl,
//       };
//
//       const users = await this.authService.authAccordingToStrategy(idP, userInfo);
//
//       done(null, instanceToPlain(users));
//     } catch (error) {
//       this.logger.error("🚀 ~ KeycloakSAMLStrategy ~ validate ~ error:", error);
//
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//       done(new Error(error.message as string), undefined);
//     }
//   }
// }
