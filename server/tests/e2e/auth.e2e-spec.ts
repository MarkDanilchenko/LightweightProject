import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import DbFactories from "../db-factories";
import { bootstrapMainTestApp } from "./bootstrapMainTestApp";
import TestAgent from "supertest/lib/agent";
import { dbCleaner } from "../utils";
import UserEntity from "@server/users/users.entity";

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

  beforeEach(async (): Promise<void> => {
    await dbCleaner(dataSource);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  afterAll(async (): Promise<void> => {
    await dataSource.destroy();
    await app.close();
  });

  describe("local signup", (): void => {
    describe("positive scenarios", (): void => {
      it("should sign up a new user with local authentication", async (): Promise<void> => {});
    });

    describe("negative scenarios", (): void => {
      it("should return 400 when signing up with an already used email", async (): Promise<void> => {});
    });
  });
});
