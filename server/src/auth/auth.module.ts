import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AppConfiguration } from "../configs/interfaces/appConfiguration.interface.js";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration")!,
          signOptions: {
            expiresIn: "1d",
          },
        };
      },
    }),
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class AuthModule {}
