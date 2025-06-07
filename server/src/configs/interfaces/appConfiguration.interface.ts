import { WinstonModuleOptions } from "nest-winston";

interface AppConfiguration {
  serverConfiguration: {
    host: string;
    port: number;
  };
  loggerConfiguration: WinstonModuleOptions;
}

export { AppConfiguration };
