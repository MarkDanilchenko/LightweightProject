import { AppConfiguration } from "./interfaces/appConfiguration.interface.js";
import * as winston from "winston";
import { utilities as nestWinstonModuleUtilities } from "nest-winston";

const { SERVER_HOST, SERVER_PORT } = process.env;

export default (): AppConfiguration => ({
  serverConfiguration: {
    host: SERVER_HOST || "127.0.0.1",
    port: Number(SERVER_PORT) || 3000,
  },
  loggerConfiguration: {
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({
            format: " - DD/MM/YYYY HH:mm:ss",
          }),
          nestWinstonModuleUtilities.format.nestLike("Nest", {
            prettyPrint: true,
            colors: true,
            processId: true,
            appName: true,
          }),
        ),
      }),
    ],
  },
});
