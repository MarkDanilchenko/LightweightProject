import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import request from "supertest";
import DbFactories from "../db-factories";
import { bootstrapMainTestApp } from "./bootstrapMainTestApp";
import TestAgent from "supertest/lib/agent";
import UserEntity from "#server/users/users.entity";
import { faker } from "@faker-js/faker";
import AuthenticationEntity from "#server/auth/auth.entity";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import TokensService from "#server/tokens/tokens.service";
import { hash } from "#server/utils/hasher";

// Mock nodemailer to prevent open handles;
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null)),
    sendMail: jest.fn((callback) => callback(null)),
  })),
}));

// Mock the app configuration partially;
jest.mock("#server/configs/app.configuration", () => {
  const mockSecret = "d227161a1d43c195902210e8e03d1021d5b0cd4d0662982597c431bafa3eb884";
  const appConfiguration = {
    ...jest.requireActual("#server/configs/app.configuration").default(),
  };

  appConfiguration["serverConfiguration"]["cookieSecret"] = mockSecret;
  appConfiguration["serverConfiguration"]["commonSecret"] = mockSecret;
  appConfiguration["jwtConfiguration"]["secret"] = mockSecret;
  appConfiguration["smtpConfiguration"] = {
    host: "smtp.example.com",
    port: 587,
    username: "tests@example.com",
    password: "tests-password",
    from: "noreply@example.com",
  };

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => appConfiguration),
  };
});

describe("UsersController E2E", (): void => {
  let app: INestApplication;
  let dataSource: DataSource;
  let factories: DbFactories;
  let httpServer: TestAgent;
  let tokensService: TokensService;

  beforeAll(async (): Promise<void> => {
    app = await bootstrapMainTestApp();
    dataSource = app.get(DataSource);
    factories = new DbFactories(dataSource);
    httpServer = request(app.getHttpServer());
    tokensService = app.get(TokensService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  afterAll(async (): Promise<void> => {
    await dataSource.destroy();
    await app.close();
  });

  describe("POST /api/v1/users/deactivate", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 200 and deactivate account successfully", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUserFactory({
          email: faker.internet.email(),
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          avatarUrl: faker.image.avatar(),
        });
        const refreshToken = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const authentication: AuthenticationEntity = await factories.buildAuthenticationFactory({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: hashedPassword,
                isEmailVerified: true,
              },
            },
            refreshToken,
          },
        );

        // Sign in to get access token from cookie
        const signinPayload = { login: user.email, password };
        const signinResponse = await httpServer.post("/api/v1/auth/local/signin").send(signinPayload);
        const accessTokenCookie = signinResponse.header["set-cookie"][0];

        const deactivatePayload = { confirmationWord: "deactivate" };
        const response = await httpServer
          .post("/api/v1/users/deactivate")
          .set("Cookie", accessTokenCookie)
          .send(deactivatePayload);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User profile deactivated successfully.");
        expect(response.header["set-cookie"]).not.toBeNull();
        expect(response.header["set-cookie"][0]).toContain("accessToken=");
      });

      it("should return 200 and deactivate account with uppercase confirmation word", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUserFactory();
        const refreshToken = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const authentication: AuthenticationEntity = await factories.buildAuthenticationFactory({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: hashedPassword,
                isEmailVerified: true,
              },
            },
            refreshToken,
          },
        );

        // Sign in to get access token from cookie
        const signinPayload = { login: user.email, password };
        const signinResponse = await httpServer.post("/api/v1/auth/local/signin").send(signinPayload);
        const accessTokenCookie = signinResponse.header["set-cookie"][0];

        const deactivatePayload = { confirmationWord: "DEACTIVATE" };
        const response = await httpServer
          .post("/api/v1/users/deactivate")
          .set("Cookie", accessTokenCookie)
          .send(deactivatePayload);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User profile deactivated successfully.");
        expect(response.header["set-cookie"]).not.toBeNull();
        expect(response.header["set-cookie"][0]).toContain("accessToken=");
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 401 for missing accessToken", async (): Promise<void> => {
        const deactivatePayload = { confirmationWord: "deactivate" };
        const response = await httpServer.post("/api/v1/users/deactivate").send(deactivatePayload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Unauthorized");
      });

      it("should return 401 for invalid accessToken", async (): Promise<void> => {
        const deactivatePayload = { confirmationWord: "deactivate" };
        const response = await httpServer
          .post("/api/v1/users/deactivate")
          .set("Cookie", "accessToken=invalid-token")
          .send(deactivatePayload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Unauthorized");
      });

      it("should return 400 for missing confirmationWord", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUserFactory();
        const refreshToken = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const authentication: AuthenticationEntity = await factories.buildAuthenticationFactory({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: hashedPassword,
                isEmailVerified: true,
              },
            },
            refreshToken,
          },
        );

        // Sign in to get access token from cookie
        const signinPayload = { login: user.email, password };
        const signinResponse = await httpServer.post("/api/v1/auth/local/signin").send(signinPayload);
        const accessTokenCookie = signinResponse.header["set-cookie"][0];

        const deactivatePayload = {};
        const response = await httpServer
          .post("/api/v1/users/deactivate")
          .set("Cookie", accessTokenCookie)
          .send(deactivatePayload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toEqual(expect.arrayContaining(["confirmationWord: Required"]));
      });

      it("should return 400 for invalid confirmationWord type", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUserFactory();
        const refreshToken = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const authentication: AuthenticationEntity = await factories.buildAuthenticationFactory({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: hashedPassword,
                isEmailVerified: true,
              },
            },
            refreshToken,
          },
        );

        // Sign in to get access token from cookie
        const signinPayload = { login: user.email, password };
        const signinResponse = await httpServer.post("/api/v1/auth/local/signin").send(signinPayload);
        const accessTokenCookie = signinResponse.header["set-cookie"][0];

        const deactivatePayload = { confirmationWord: 123 };
        const response = await httpServer
          .post("/api/v1/users/deactivate")
          .set("Cookie", accessTokenCookie)
          .send(deactivatePayload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toEqual(
          expect.arrayContaining(["confirmationWord: Expected string, received number"]),
        );
      });
    });
  });
});
