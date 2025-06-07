import { WinstonModuleOptions } from "nest-winston";

interface AppConfiguration {
  serverConfiguration: {
    host: string;
    port: number;
    cookieSecret: string;
  };
  loggerConfiguration: WinstonModuleOptions;
}

export { AppConfiguration };
