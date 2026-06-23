import * as path from "node:path";
import * as fs from "node:fs";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "./configs/interfaces/appConfiguration.interfaces";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { InternalServerErrorException } from "@nestjs/common";
import { patchNestjsSwagger } from "@anatine/zod-nestjs";
import AppModule from "#server/app.module";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";

/**
 * Bootstraps the NestJS application.
 *
 * @returns {Promise<void>} - A promise which resolves when the application is ready.
 */
async function bootstrap(): Promise<void> {
  const https: boolean = process.env.HTTPS === "true";
  let httpsOptions: HttpsOptions | undefined;
  // HTTPS option is overwritten in the app.configuration if NODE_env is "test";
  if (https && process.env.NODE_ENV !== "test") {
    if (!process.env.CERT_PATH || !process.env.KEY_PATH) {
      throw new InternalServerErrorException(
        "Both CERT_PATH and KEY_PATH env variables must be set when HTTPS is enabled!",
      );
    }

    httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, "../../../" + process.env.KEY_PATH)),
      cert: fs.readFileSync(path.join(__dirname, "../../../" + process.env.CERT_PATH)),
    };
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    httpsOptions,
  });

  const configService = app.get(ConfigService);
  const { host, port, cookieSecret, swaggerEnabled, protocol } =
    configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.use(cookieParser(cookieSecret));
  app.setGlobalPrefix("api/v1");
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Necessary for secure cookie parser to work while have nginx proxy;
  // app.getHttpAdapter().getInstance().set("trust proxy", 1);

  if (swaggerEnabled) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const packageJsonInfo: Record<string, string> = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../../package.json"), "utf-8"),
    );

    const swaggerConfiguration = new DocumentBuilder()
      .setTitle(packageJsonInfo.name)
      .setDescription(packageJsonInfo.description)
      .setContact("", packageJsonInfo.author, "")
      .setVersion(packageJsonInfo.version)
      .addBearerAuth({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      })
      .addCookieAuth(
        "accessToken",
        {
          type: "apiKey",
          description: "API jwt access token in cookies",
          name: "accessToken",
          in: "cookie",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        "accessToken",
      )
      .addOAuth2(
        {
          type: "oauth2",
          description: "Google OAuth2",
          name: "googleOAuth2",
          scheme: "googleOAuth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
              tokenUrl: "https://oauth2.googleapis.com/token",
              scopes: {
                email: "User's email",
                profile: "User's basic profile information",
              },
            },
          },
        },
        "googleOAuth2",
      )
      .addOAuth2(
        {
          type: "oauth2",
          description: "Keycloak OpenID Connect",
          name: "keycloakOAuth2OIDC",
          scheme: "keycloakOAuth2OIDC",
          flows: {
            authorizationCode: {
              authorizationUrl: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["oidc"]["authUrl"]>(
                "authConfiguration.keycloak.oidc.authUrl",
              ),
              tokenUrl: configService.get<AppConfiguration["authConfiguration"]["keycloak"]["oidc"]["idTokenUrl"]>(
                "authConfiguration.keycloak.oidc.idTokenUrl",
              ),
              scopes: {
                email: "User's email",
                profile: "User's basic profile information",
                openid: "User's identity provider",
              },
            },
          },
          openIdConnectUrl: configService.get<
            AppConfiguration["authConfiguration"]["keycloak"]["oidc"]["discoveryUrl"]
          >("authConfiguration.keycloak.oidc.discoveryUrl")!,
        },
        "keycloakOAuth2OIDC",
      )
      .addOAuth2(
        {
          type: "oauth2",
          description: "GitHub OAuth2",
          name: "githubOAuth2",
          scheme: "githubOAuth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://github.com/login/oauth/authorize",
              tokenUrl: "https://github.com/login/oauth/access_token",
              scopes: {
                email: "User's email",
              },
            },
          },
        },
        "githubOAuth2",
      )
      .addOAuth2(
        {
          type: "oauth2",
          description: "Yandex OAuth2",
          name: "yandexOAuth2",
          scheme: "yandexOAuth2",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://oauth.yandex.ru/authorize",
              tokenUrl: "https://oauth.yandex.ru/token",
              scopes: {
                "login:email": "Access to user's email address",
                "login:info": "Access to user's basic profile information",
                "login:avatar": "Access to user's avatar image",
              },
            },
          },
        },
        "yandexOAuth2",
      )
      .build();

    // Swagger patch function to support zod validation;
    patchNestjsSwagger();

    /**
     * Factory function for creating OpenAPI document.
     *
     * @returns {OpenAPIObject} - The OpenAPI document.
     */
    const documentFactory = (): OpenAPIObject => SwaggerModule.createDocument(app, swaggerConfiguration);
    SwaggerModule.setup("docs", app, documentFactory, {
      jsonDocumentUrl: "docs/json",
      yamlDocumentUrl: "docs/yaml",
    });
  }

  await app.listen(port, host, (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    app
      .get(WINSTON_MODULE_NEST_PROVIDER)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .log(`Server is running on ${protocol}://${host}:${port}`, "NestApplication");
  });
}

void bootstrap();
