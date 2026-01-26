import * as cookieParser from "cookie-parser";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import AppModule from "@server/app.module";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

export async function bootstrapE2ETestApp(): Promise<INestApplication> {
  const testingModule: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = testingModule.createNestApplication({
    cors: true,
    httpsOptions: {},
  });

  const configService = app.get(ConfigService);
  const { cookieSecret } = configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

  app.use(cookieParser(cookieSecret));
  app.setGlobalPrefix("api/v1");
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.init();

  return app;
}
