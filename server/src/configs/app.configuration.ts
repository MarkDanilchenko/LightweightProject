import * as dotenv from "dotenv";
import * as winston from "winston";
import AppConfiguration from "./interfaces/appConfiguration.interface.js";
import { utilities as nestWinstonModuleUtilities } from "nest-winston";

dotenv.config({ path: "./.env.development" });

export default (): AppConfiguration => {
  const {
    SERVER_HOST,
    SERVER_PORT,
    COOKIE_SECRET,
    SWAGGER_ENABLED,
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_NAME,
    DATABASE_USER,
    DATABASE_PASSWORD,
    TYPEORM_LOGGING,
    TYPEORM_MIGRATIONS_RUN,
    JWT_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL,
    ENCODER_SECRET,
  } = process.env;

  return {
    serverConfiguration: {
      host: SERVER_HOST || "127.0.0.1",
      port: Number(SERVER_PORT) || 3000,
      cookieSecret: COOKIE_SECRET!,
      swaggerEnabled: SWAGGER_ENABLED === "true",
      encoderSecret: ENCODER_SECRET!,
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
    dbConfiguration: {
      type: "postgres",
      host: DATABASE_HOST || "127.0.0.1",
      port: Number(DATABASE_PORT) || 5432,
      database: DATABASE_NAME,
      username: DATABASE_USER,
      password: DATABASE_PASSWORD,
      logging: TYPEORM_LOGGING === "true",
      migrationsRun: TYPEORM_MIGRATIONS_RUN === "true",
      entities: ["**/*.entity.js"],
      migrations: ["**/migrations/*.{ts,js}"],
      applicationName: "SimpleAuth3",
    },
    jwtConfiguration: {
      secret: JWT_SECRET!,
      accessTokenExpiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN || "24h",
      refreshTokenExpiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
    },
    authConfiguration: {
      google: {
        clientID: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        callbackURL: GOOGLE_CALLBACK_URL!,
      },
    },
  };
};
