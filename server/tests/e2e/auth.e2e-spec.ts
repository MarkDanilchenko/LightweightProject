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
  let factories: DbFactories;
  let httpServer: TestAgent;

  beforeAll(async (): Promise<void> => {
    app = await bootstrapMainTestApp();
    dataSource = app.get(DataSource);
    factories = new DbFactories(dataSource);
    httpServer = request(app.getHttpServer());
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
        await factories.buildAuthentication({
          userId: user.id,
          provider: AuthenticationProvider.GOOGLE,
          metadata: {
            google: {},
          },
        });

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        const userAuthenticationsCount: number = await dataSource
          .getRepository(AuthenticationEntity)
          .count({ where: { userId: user.id } });

        expect(response.statusCode).toBe(201);
        expect(userAuthenticationsCount).toBe(2);
      });
    });

    describe("negative scenarios", (): void => {
      it("should return 400 when signing up with an already used username", async (): Promise<void> => {
        const existingUsername = faker.string.alphanumeric(10);

        await factories.buildUser({ username: existingUsername });

        const payload = {
          username: existingUsername,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          avatarUrl: faker.image.avatar(),
          password: "Password1",
        };

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
});
