import * as path from "node:path";
import * as fs from "node:fs";
import * as cookieParser from "cookie-parser";
import { INestApplication, InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import AppModule from "@server/app.module";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

export async function bootstrapMainTestApp(): Promise<INestApplication> {
  const https: boolean = process.env.HTTPS === "true";
  const httpsOptions: { key?: Buffer; cert?: Buffer } = {};
  if (https) {
    if (!process.env.CERT_PATH || !process.env.KEY_PATH) {
      throw new InternalServerErrorException(
        "Both CERT_PATH and KEY_PATH env variables must be set when HTTPS is enabled!",
      );
    }

    httpsOptions.key = fs.readFileSync(path.join(process.cwd(), process.env.KEY_PATH));
    httpsOptions.cert = fs.readFileSync(path.join(process.cwd(), process.env.CERT_PATH));
  }

  const testingModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = testingModule.createNestApplication({
    cors: true,
    httpsOptions,
  });

  const configService = app.get(ConfigService);
  const { cookieSecret } = configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.use(cookieParser(cookieSecret));
  app.setGlobalPrefix("api/v1");
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.init();

  return app;
}
