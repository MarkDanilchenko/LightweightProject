import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { WinstonModuleOptions } from "nest-winston";
import { DataSourceOptions } from "typeorm";

interface AppConfiguration {
  serverConfiguration: {
    host: string;
    port: number;
    cookieSecret: string;
    swaggerEnabled: boolean;
  };
  loggerConfiguration: WinstonModuleOptions;
  dbConfiguration: TypeOrmModuleOptions | DataSourceOptions;
  jwtConfiguration: {
    secret: string;
    accessTokenExpiresIn: string;
  };
  authConfiguration: {
    google: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
    };
  };
}

export { AppConfiguration };
