import * as fs from "node:fs";
import * as cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import AppModule from "./app.module.js";
import AppConfiguration from "./configs/interfaces/appConfiguration.interface.js";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const { host, port, cookieSecret, swaggerEnabled } =
    configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.setGlobalPrefix("api/v1");

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(cookieParser(cookieSecret));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

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
      .build();
    const documentFactory = () => {
      return SwaggerModule.createDocument(app, swaggerConfiguration);
    };
    SwaggerModule.setup("docs", app, documentFactory, {
      jsonDocumentUrl: "docs/json",
      yamlDocumentUrl: "docs/yaml",
    });
  }

  await app.listen(port, host, () => {
    app.get(WINSTON_MODULE_NEST_PROVIDER).log(`Server is running on http://${host}:${port}`, "SimpleAuth3");
  });
}

bootstrap();
