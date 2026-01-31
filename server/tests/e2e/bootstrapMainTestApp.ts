import * as path from "node:path";
import * as fs from "node:fs";
import * as cookieParser from "cookie-parser";
import { INestApplication, InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import AppModule from "@server/app.module";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { RMQ_MICROSERVICE } from "@server/configs/constants";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";

/**
 * Bootstrap the main test app.
 * Overrides the RMQ_MICROSERVICE provider to prevent open handles.
 *
 * @returns {Promise<INestApplication>} A Promise that resolves to the test app.
 */
export async function bootstrapMainTestApp(): Promise<INestApplication> {
  const https: boolean = process.env.HTTPS === "true";
  let httpsOptions: HttpsOptions | undefined;
  if (https && process.env.NODE_ENV !== "test") {
    if (!process.env.CERT_PATH || !process.env.KEY_PATH) {
      throw new InternalServerErrorException(
        "Both CERT_PATH and KEY_PATH env variables must be set when HTTPS is enabled!",
      );
    }

    httpsOptions = {
      key: fs.readFileSync(path.join(process.cwd(), process.env.KEY_PATH)),
      cert: fs.readFileSync(path.join(process.cwd(), process.env.CERT_PATH)),
    };
  }

  const testingModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(RMQ_MICROSERVICE)
    .useValue({ emit: jest.fn() })
    .compile();

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
