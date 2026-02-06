import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import DbFactories from "../db-factories";
import { bootstrapMainTestApp } from "./bootstrapMainTestApp";
import TestAgent from "supertest/lib/agent";
import UserEntity from "@server/users/users.entity";
import { faker } from "@faker-js/faker";
import AuthenticationEntity from "@server/auth/auth.entity";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import EventEntity from "@server/events/events.entity";
import { EventName } from "@server/events/interfaces/events.interfaces";
import TokensService from "@server/tokens/tokens.service";
import { hash } from "@server/utils/hasher";

// Mock nodemailer to prevent open handles
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn((callback) => callback(null)),
    sendMail: jest.fn((callback) => callback(null)),
  })),
}));

describe("AuthController E2E", (): void => {
  let app: INestApplication;
  let dataSource: DataSource;
  let configService: ConfigService;
  let factories: DbFactories;
  let httpServer: TestAgent;
  let tokensService: TokensService;
  let serverBaseUrl: string;
  let clientBaseUrl: string;

  beforeAll(async (): Promise<void> => {
    app = await bootstrapMainTestApp();
    dataSource = app.get(DataSource);
    configService = app.get(ConfigService);
    factories = new DbFactories(dataSource);
    httpServer = request(app.getHttpServer());
    tokensService = app.get(TokensService);
    serverBaseUrl =
      configService.get<AppConfiguration["serverConfiguration"]["baseUrl"]>("serverConfiguration.baseUrl")!;
    clientBaseUrl =
      configService.get<AppConfiguration["clientConfiguration"]["baseUrl"]>("clientConfiguration.baseUrl")!;
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  afterAll(async (): Promise<void> => {
    await dataSource.destroy();
    await app.close();
  });

  describe("POST /api/v1/auth/local/signup", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 201 and sign up a new user with local authentication", async (): Promise<void> => {
        const payload = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          avatarUrl: faker.image.avatar(),
          password: "12345Abc",
        };

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        const user: UserEntity | null = await dataSource.getRepository(UserEntity).findOneBy({
          email: payload.email,
        });
        const authentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOneBy({ userId: user?.id, provider: AuthenticationProvider.LOCAL });

        expect(response.statusCode).toBe(201);
        expect(user).toBeDefined();
        expect(user?.email).toBe(payload.email);
        expect(user?.firstName).toBeNull();
        expect(user?.lastName).toBeNull();
        expect(user?.username).toBeNull();
        expect(user?.avatarUrl).toBeNull();
        expect(authentication).toBeDefined();
        expect(authentication?.metadata.local?.isEmailVerified).toBeFalsy();
        expect(authentication?.metadata.local?.password).toBeTruthy();
        expect(authentication?.metadata.local?.password).not.toEqual(payload.password);
        expect(authentication?.metadata.local?.password).toEqual(expect.any(String));
        expect(authentication?.metadata.local?.temporaryInfo).toEqual({
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          avatarUrl: payload.avatarUrl,
        });
        expect(authentication?.refreshToken).toBeNull();
      });

      it("should return 201 and create local authentication for the already signed up user with not local authentication", async (): Promise<void> => {
        const payload = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          avatarUrl: faker.image.avatar(),
          password: "12345Abc",
        };

        const user: UserEntity = await factories.buildUser({
          email: payload.email,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          avatarUrl: payload.avatarUrl,
        });
        const refreshToken: string = await tokensService.generate({
          userId: user.id,
          provider: AuthenticationProvider.GOOGLE,
        });
        await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.GOOGLE,
          refreshToken,
          metadata: {
            google: {},
          },
        });

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        const userAuthenticationsCount: number = await dataSource
          .getRepository(AuthenticationEntity)
          .count({ where: { userId: user.id } });

        const localAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({
            where: {
              userId: user.id,
              provider: AuthenticationProvider.LOCAL,
            },
          });

        expect(response.statusCode).toBe(201);
        expect(userAuthenticationsCount).toBe(2);
        expect(localAuthentication).not.toBeNull();
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 400 when signing up with an already used username", async (): Promise<void> => {
        const existingUsername = faker.string.alphanumeric(10);
        const payload = {
          username: existingUsername,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          avatarUrl: faker.image.avatar(),
          password: "Password1",
        };

        await factories.buildUser({ username: existingUsername });

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        expect(response.statusCode).toBe(400);
      });

      it("should return 400 when signing up with an already existing local authentication", async (): Promise<void> => {
        const existingEmail = faker.internet.email();
        const payload = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: existingEmail,
          avatarUrl: faker.image.avatar(),
          password: "Password1",
        };

        const existingUser: UserEntity = await factories.buildUser({
          email: existingEmail,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          avatarUrl: payload.avatarUrl,
        });
        await factories.buildAuthentication({
          userId: existingUser.id,
          provider: AuthenticationProvider.LOCAL,
          metadata: {
            local: {
              isEmailVerified: false,
              password: faker.string.alphanumeric(64),
              temporaryInfo: {
                username: payload.username,
                firstName: payload.firstName,
                lastName: payload.lastName,
                avatarUrl: payload.avatarUrl,
              },
            },
          },
        });

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Already signed up." + " Email verification is required to proceed.");
      });

      it("should return 400 when signing up with an already existing local authentication and verified email", async (): Promise<void> => {
        const existingEmail = faker.internet.email();
        const payload = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: existingEmail,
          avatarUrl: faker.image.avatar(),
          password: "Password1",
        };

        const existingUser: UserEntity = await factories.buildUser({
          email: existingEmail,
          username: payload.username,
          firstName: payload.firstName,
          lastName: payload.lastName,
          avatarUrl: payload.avatarUrl,
        });
        // buildAuthentication() has by default isEmailVerified: true;
        await factories.buildAuthentication({
          userId: existingUser.id,
          provider: AuthenticationProvider.LOCAL,
        });

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
          "Already signed up." + " Please, sign in with local authentication credentials.",
        );
      });
    });
  });

  describe("POST /api/v1/auth/local/verification/email", (): void => {
    describe("positive scenarios", (): void => {
      it(`should return 302, redirect to clientBaseUrl/home endpoint and set cookies with access token`, async (): Promise<void> => {
        const temporaryInfo = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          avatarUrl: faker.image.avatar(),
        };

        const user: UserEntity = await factories.buildUser({
          email: faker.internet.email(),
          username: null,
          firstName: null,
          lastName: null,
          avatarUrl: null,
        });

        const token: string = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          metadata: {
            local: {
              isEmailVerified: false,
              password: faker.string.alphanumeric(64),
              callbackUrl: `${serverBaseUrl}/api/v1/auth/local/verification/email?token=${token}`,
              temporaryInfo,
            },
          },
        });

        const response = await httpServer.post(`/api/v1/auth/local/verification/email`).query({ token }).send();

        const updatedUser: UserEntity | null = await dataSource
          .getRepository(UserEntity)
          .findOne({ where: { id: user.id } });
        const updatedAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({ where: { id: authentication.id } });
        const event: EventEntity | null = await dataSource
          .getRepository(EventEntity)
          .findOne({ where: { name: EventName.AUTH_LOCAL_EMAIL_VERIFIED, userId: user.id } });

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(`${clientBaseUrl}/home`);
        expect(response.header["set-cookie"]).not.toBeNull();
        expect(response.header["set-cookie"][0]).toContain("accessToken");
        expect(updatedUser).not.toBeNull();
        expect(updatedAuthentication).not.toBeNull();
        expect(updatedUser?.username).toBe(temporaryInfo.username);
        expect(updatedUser?.firstName).toBe(temporaryInfo.firstName);
        expect(updatedUser?.lastName).toBe(temporaryInfo.lastName);
        expect(updatedUser?.avatarUrl).toBe(temporaryInfo.avatarUrl);
        expect(updatedAuthentication?.metadata?.local?.isEmailVerified).toBeTruthy();
        expect(updatedAuthentication?.refreshToken).not.toBeNull();
        expect(event).not.toBeNull();
        expect(event?.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFIED);
        expect(event?.userId).toBe(user.id);
        expect(event?.modelId).toBe(authentication.id);
      });

      it(`should return 302, redirect to clientBaseUrl/home endpoint and set cookies with access token and set refreshToken of other authentications to NULL`, async (): Promise<void> => {
        const temporaryInfo = {
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          avatarUrl: faker.image.avatar(),
        };

        const user: UserEntity = await factories.buildUser({
          email: faker.internet.email(),
          username: null,
          firstName: null,
          lastName: null,
          avatarUrl: null,
        });

        const token: string = await tokensService.generate({ userId: user.id, provider: AuthenticationProvider.LOCAL });
        const localAuthentication: AuthenticationEntity = await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          metadata: {
            local: {
              isEmailVerified: false,
              password: faker.string.alphanumeric(64),
              callbackUrl: `${serverBaseUrl}/api/v1/auth/local/verification/email?token=${token}`,
              temporaryInfo,
            },
          },
        });
        const googleAuthentication: AuthenticationEntity = await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.GOOGLE,
          metadata: {
            google: {},
          },
        });

        const response = await httpServer.post(`/api/v1/auth/local/verification/email`).query({ token }).send();

        const updatedUser: UserEntity | null = await dataSource
          .getRepository(UserEntity)
          .findOne({ where: { id: user.id } });
        const updatedLocalAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({ where: { id: localAuthentication.id } });
        const updatedGoogleAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({ where: { id: googleAuthentication.id } });
        const event: EventEntity | null = await dataSource
          .getRepository(EventEntity)
          .findOne({ where: { name: EventName.AUTH_LOCAL_EMAIL_VERIFIED, userId: user.id } });

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(`${clientBaseUrl}/home`);
        expect(response.header["set-cookie"]).not.toBeNull();
        expect(response.header["set-cookie"][0]).toContain("accessToken");
        expect(updatedUser).not.toBeNull();
        expect(updatedLocalAuthentication).not.toBeNull();
        expect(updatedUser?.username).toBe(temporaryInfo.username);
        expect(updatedUser?.firstName).toBe(temporaryInfo.firstName);
        expect(updatedUser?.lastName).toBe(temporaryInfo.lastName);
        expect(updatedUser?.avatarUrl).toBe(temporaryInfo.avatarUrl);
        expect(updatedLocalAuthentication?.metadata?.local?.isEmailVerified).toBeTruthy();
        expect(updatedLocalAuthentication?.refreshToken).not.toBeNull();
        expect(updatedGoogleAuthentication?.refreshToken).toBeNull();
        expect(event).not.toBeNull();
        expect(event?.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFIED);
        expect(event?.userId).toBe(user.id);
        expect(event?.modelId).toBe(localAuthentication.id);
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 400 when token is missing", async (): Promise<void> => {
        const response = await httpServer.post("/api/v1/auth/local/verification/email").send();

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toEqual(expect.arrayContaining(["token: Required"]));
      });

      it("should return 302 and redirect to signin page with error message when token is invalid", async (): Promise<void> => {
        const response = await httpServer
          .post("/api/v1/auth/local/verification/email")
          .query({ token: "invalid-token" })
          .send();

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(
          `${clientBaseUrl}/signin?errorMsg=${encodeURIComponent("Invalid token")}`,
        );
      });

      it("should return 302 and redirect to signin page with error message when token is expired", async (): Promise<void> => {
        const user: UserEntity = await factories.buildUser();
        const expiredToken: string = await tokensService.generate(
          { userId: user.id, provider: AuthenticationProvider.LOCAL },
          { expiresIn: "-1h" },
        );

        const response = await httpServer
          .post("/api/v1/auth/local/verification/email")
          .query({ token: expiredToken })
          .send();

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(
          `${clientBaseUrl}/signin?errorMsg=${encodeURIComponent("Token expired")}`,
        );
      });

      it("should return 302 and redirect to signin page with error message when user has no local authentication", async (): Promise<void> => {
        const user: UserEntity = await factories.buildUser();
        const token: string = await tokensService.generate({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });

        const response = await httpServer.post("/api/v1/auth/local/verification/email").query({ token }).send();

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(
          `${clientBaseUrl}/signin?errorMsg=${encodeURIComponent("Authentication not found.")}`,
        );
      });

      it("should return 302 and redirect to signin page with error message when email is already verified", async (): Promise<void> => {
        const user: UserEntity = await factories.buildUser();
        const token: string = await tokensService.generate({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        // Email in local authentication has already been verified here;
        await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });

        const response = await httpServer.post("/api/v1/auth/local/verification/email").query({ token }).send();

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(
          `${clientBaseUrl}/signin?errorMsg=${encodeURIComponent("Email has been already verified.")}`,
        );
      });

      it("should return 302 and redirect to signin page with error message when provider in token does not match local authentication provider", async (): Promise<void> => {
        const user: UserEntity = await factories.buildUser();
        const token: string = await tokensService.generate({
          userId: user.id,
          provider: AuthenticationProvider.GOOGLE, // Different provider
        });

        const response = await httpServer.post("/api/v1/auth/local/verification/email").query({ token }).send();

        expect(response.statusCode).toBe(302);
        expect(response.header["location"]).toBe(
          `${clientBaseUrl}/signin?errorMsg=${encodeURIComponent("Invalid token.")}`,
        );
      });
    });
  });

  describe("POST /api/v1/auth/local/signin", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 200 and set accessToken cookie on successful signin", async (): Promise<void> => {
        const password = "12345Abc";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser({
          email: faker.internet.email(),
          username: faker.string.alphanumeric(10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          avatarUrl: faker.image.avatar(),
        });
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
              },
            },
          },
        );

        const payload = { login: user.email, password };

        const response = await httpServer.post("/api/v1/auth/local/signin").send(payload);

        const updatedAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({
            where: {
              userId: user.id,
              provider: AuthenticationProvider.LOCAL,
            },
          });

        expect(response.statusCode).toBe(200);
        expect(response.header["set-cookie"]).not.toBeNull();
        expect(response.header["set-cookie"][0]).toContain("accessToken");
        expect(updatedAuthentication).not.toBeNull();
        expect(updatedAuthentication?.refreshToken).not.toBeNull();
      });

      it("should handle signin both with username and email", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
              },
            },
          },
        );

        let requests = 0;
        const payload = { login: "", password };

        while (requests < 2) {
          if (requests === 0) {
            payload.login = user.username!;
          } else {
            payload.login = user.email;
          }

          const response = await httpServer.post("/api/v1/auth/local/signin").send(payload);

          expect(response.statusCode).toBe(200);
          expect(response.header["set-cookie"]).not.toBeNull();
          expect(response.header["set-cookie"][0]).toContain("accessToken");

          requests++;
        }
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 401 for invalid credentials", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
              },
            },
          },
        );

        const payload = { login: user.email, password: "wrongPassword" };

        const response = await httpServer.post("/api/v1/auth/local/signin").send(payload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Authentication failed");
      });

      it("should return 401 for unverified email", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
                isEmailVerified: false,
              },
            },
          },
        );

        const payload = { login: user.email, password };

        const response = await httpServer.post("/api/v1/auth/local/signin").send(payload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Authentication failed");
      });

      it("should return 400 for invalid request body", async (): Promise<void> => {
        const payload = {
          login: "test@example.com",
          // Missing required password field;
        };

        const response = await httpServer.post("/api/v1/auth/local/signin").send(payload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Unauthorized");
      });
    });
  });

  describe("POST /api/v1/auth/local/password/forgot", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 200 and send password reset email", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
          },
        );

        const payload = { email: user.email };

        const response = await httpServer.post("/api/v1/auth/local/password/forgot").send(payload);

        expect(response.statusCode).toBe(200);
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 400 for invalid email format", async (): Promise<void> => {
        const payload = { email: "invalid-email-format" };

        const response = await httpServer.post("/api/v1/auth/local/password/forgot").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toEqual(expect.arrayContaining(["email: Invalid email"]));
      });

      it("should return 400 for user with not verified email", async (): Promise<void> => {
        const password = "Password123";
        const hashedPassword: string = await hash(password);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
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
                isEmailVerified: false,
              },
            },
          },
        );

        const payload = { email: user.email };

        const response = await httpServer.post("/api/v1/auth/local/password/forgot").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain(`Email "${user.email}" is not verified yet.`);
      });
    });
  });

  describe("POST /api/v1/auth/local/password/reset", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 200 and reset password successfully", async (): Promise<void> => {
        const oldPassword = "OldPassword123";
        const newPassword = "NewPassword123";
        const oldHashedPassword: string = await hash(oldPassword);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: oldHashedPassword,
                isEmailVerified: true,
              },
            },
          },
        );

        // Generate token using the current password as secret (as per service logic);
        const token: string = await tokensService.generate(
          { userId: user.id, provider: AuthenticationProvider.LOCAL },
          { secret: oldHashedPassword, expiresIn: "15m" },
        );

        const payload = { token, password: newPassword };

        const response = await httpServer.post("/api/v1/auth/local/password/reset").send(payload);

        const updatedAuthentication: AuthenticationEntity | null = await dataSource
          .getRepository(AuthenticationEntity)
          .findOne({
            where: {
              userId: user.id,
              provider: AuthenticationProvider.LOCAL,
            },
          });

        expect(response.statusCode).toBe(200);
        expect(updatedAuthentication).not.toBeNull();
        expect(updatedAuthentication?.metadata.local?.password).not.toBe(oldHashedPassword);
        expect(updatedAuthentication?.metadata.local?.password).toBeTruthy();
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 401 for invalid token", async (): Promise<void> => {
        const payload = {
          token: "invalid-token",
          password: "NewPassword123",
        };

        const response = await httpServer.post("/api/v1/auth/local/password/reset").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain("Token is invalid.");
      });

      it("should return 401 for expired token", async (): Promise<void> => {
        const oldPassword = "OldPassword123";
        const oldHashedPassword: string = await hash(oldPassword);

        const user: UserEntity = await factories.buildUser();
        const authentication: AuthenticationEntity = await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        });
        await dataSource.getRepository(AuthenticationEntity).update(
          { id: authentication.id },
          {
            metadata: {
              local: {
                ...authentication.metadata.local,
                password: oldHashedPassword,
                isEmailVerified: true,
              },
            },
          },
        );

        // Generate expired token
        const token: string = await tokensService.generate(
          { userId: user.id, provider: AuthenticationProvider.LOCAL },
          { secret: oldHashedPassword, expiresIn: "-1h" },
        );

        const payload = { token, password: "NewPassword123" };

        const response = await httpServer.post("/api/v1/auth/local/password/reset").send(payload);

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toContain("Token expired");
      });

      it("should return 400 for invalid request body", async (): Promise<void> => {
        const payload = {
          token: "some-token",
          // Missing password field
        };

        const response = await httpServer.post("/api/v1/auth/local/password/reset").send(payload);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toEqual(expect.arrayContaining(["password: Required"]));
      });
    });
  });

  // describe("POST /api/v1/auth/signout", (): void => {
  //   describe("positive scenarios", (): void => {
  //     it("should return 200 and clear accessToken cookie", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  //
  //   describe("negative scenarios", (): void => {
  //     it("should return 401 for missing accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 401 for invalid accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  // });
  //
  // describe("POST /api/v1/auth/refresh", (): void => {
  //   describe("positive scenarios", (): void => {
  //     it("should return 200 and refresh accessToken from cookie", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 200 and refresh accessToken from authorization header", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should prioritize cookie over authorization header when both present", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  //
  //   describe("negative scenarios", (): void => {
  //     it("should return 401 for missing accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 401 for invalid accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 401 for malformed authorization header", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  // });
  //
  // describe("GET /api/v1/auth/me", (): void => {
  //   describe("positive scenarios", (): void => {
  //     it("should return 200 and user profile", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  //
  //   describe("negative scenarios", (): void => {
  //     it("should return 401 for missing accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 401 for invalid accessToken", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //
  //     it("should return 404 for non-existent user", async (): Promise<void> => {
  //       // TODO: Implement test
  //     });
  //   });
  // });
});
