import * as AdminJSTypeorm from "@adminjs/typeorm";
import AdminJS from "adminjs";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import UsersModule from "#server/users/users.module";
import AuthModule from "#server/auth/auth.module";
import EventsModule from "#server/events/events.module";
import AuthenticationEntity from "#server/auth/auth.entity";
import EventEntity from "#server/events/events.entity";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import { AdminModuleOptions } from "@adminjs/nestjs";
import UserEntity from "#server/users/users.entity";

// Add/register AdminJS adapter;
AdminJS.registerAdapter({
  Resource: AdminJSTypeorm.Resource,
  Database: AdminJSTypeorm.Database,
});

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    AuthModule,
    EventsModule,
    import("@adminjs/nestjs").then(({ AdminModule }) =>
      AdminModule.createAdminAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const logger = new Logger("AdminModule");
          const adminSettings: AdminModuleOptions = {
            adminJsOptions: {
              rootPath: "/admin",
              resources: [
                UserEntity,
                {
                  resource: AuthenticationEntity,
                  options: {
                    properties: {
                      refreshToken: {
                        isVisible: {
                          edit: false,
                          show: false,
                          list: false,
                          filter: false,
                        },
                      },
                    },
                  },
                },
                EventEntity,
              ],
            },
          };

          const { adminEmail, adminPassword, cookieName, cookiePassword, secret } =
            configService.get<AppConfiguration["adminConfiguration"]>("adminConfiguration")!;
          const https =
            configService.get<AppConfiguration["serverConfiguration"]["https"]>("serverConfiguration.https");

          if (!adminEmail || !adminPassword || !cookieName || !cookiePassword || !secret) {
            logger.warn("Admin configuration is not set properly, unauthorized usage is possible!");

            return adminSettings;
          }

          adminSettings.auth = {
            authenticate: async (email: string, password: string): Promise<{ email: string } | null> => {
              if (email === adminEmail && password === adminPassword) {
                return Promise.resolve({ email: adminEmail });
              }

              return null;
            },
            cookieName,
            cookiePassword,
          };
          adminSettings.sessionOptions = {
            resave: true,
            saveUninitialized: true,
            secret,
            cookie: {
              httpOnly: true,
              signed: true,
              secure: https,
            },
          };

          return adminSettings;
        },
      }),
    ),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export default class AdminModule {}
