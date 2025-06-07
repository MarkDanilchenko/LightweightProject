import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import AppModule from "./app.module.js";
import { AppConfiguration } from "./configs/interfaces/appConfiguration.interface.js";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const { host, port, cookieSecret } =
    configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.use(cookieParser(cookieSecret));

  await app.listen(port, host, () => {
    app.get(WINSTON_MODULE_NEST_PROVIDER).log(`Server is running on http://${host}:${port}`, "SimpleAuth3");
  });
}

bootstrap();
