import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { WinstonModuleOptions } from "nest-winston";

interface AppConfiguration {
  serverConfiguration: {
    host: string;
    port: number;
    cookieSecret: string;
    swaggerEnabled: boolean;
  };
  loggerConfiguration: WinstonModuleOptions;
  dbConfiguration: TypeOrmModuleOptions;
}

export { AppConfiguration };
