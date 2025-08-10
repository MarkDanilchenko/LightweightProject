import * as fs from "node:fs";
import * as cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import AppModule from "./app.module.js";
import AppConfiguration from "./configs/interfaces/appConfiguration.interface.js";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { InternalServerErrorException } from "@nestjs/common";
import { patchNestjsSwagger } from "@anatine/zod-nestjs";

async function bootstrap(): Promise<void> {
  const https = process.env.HTTPS === "true";
  const httpsOptions: { key?: any; cert?: any } = {};
  if (https) {
    if (!process.env.TLS_CERT_PATH || !process.env.TLS_KEY_PATH) {
      throw new InternalServerErrorException("TLS_CERT_PATH and TLS_KEY_PATH env variables must be set!");
    }

    httpsOptions.key = fs.readFileSync(process.env.TLS_KEY_PATH);
    httpsOptions.cert = fs.readFileSync(process.env.TLS_CERT_PATH);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    httpsOptions,
  });

  const configService = app.get(ConfigService);
  const { host, port, cookieSecret, swaggerEnabled } =
    configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.setGlobalPrefix("api/v1");

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(cookieParser(cookieSecret));

  // NOTE: new ValidationPipe does not work with zod validation;
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //   }),
  // );

  if (swaggerEnabled) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const packageJsonInfo: Record<string, any> = JSON.parse(fs.readFileSync("../package.json", "utf-8"));

    const swaggerConfiguration = new DocumentBuilder()
      .setTitle(packageJsonInfo.name)
      .setDescription(packageJsonInfo.description)
      .setVersion(packageJsonInfo.version)
      .addBearerAuth({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      })
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
      .addCookieAuth(
        "accessToken",
        {
          type: "apiKey",
          description: "Access token in cookie",
          name: "accessToken",
          in: "cookie",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        "accessToken",
      )
      .build();

    patchNestjsSwagger();

    const documentFactory = () => {
      return SwaggerModule.createDocument(app, swaggerConfiguration);
    };
    SwaggerModule.setup("docs", app, documentFactory, {
      jsonDocumentUrl: "docs/json",
      yamlDocumentUrl: "docs/yaml",
    });
  }

  await app.listen(port, host, () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    app
      .get(WINSTON_MODULE_NEST_PROVIDER)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .log(`Server is running on http${https ? "s" : ""}://${host}:${port}`, "LightweightProject");
  });
}

void bootstrap();
