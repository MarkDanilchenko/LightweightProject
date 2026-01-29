import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import DbFactories from "../db-factories";
import { bootstrapTestApp } from "./main.bootstrap.e2e";
import TestAgent from "supertest/lib/agent";
import { dbCleaner } from "../utils";
import UserEntity from "@server/users/users.entity";

describe("AuthController E2E", (): void => {
  let app: INestApplication;
  let dataSource: DataSource;
  let factories: DbFactories;
  let httpServer: TestAgent;

  beforeAll(async (): Promise<void> => {
    app = await bootstrapTestApp();
    dataSource = app.get(DataSource);
    factories = new DbFactories(dataSource);
    httpServer = request(app.getHttpServer());
  });

  beforeEach(async (): Promise<void> => {
    await dbCleaner(dataSource);
  });

  afterAll(async (): Promise<void> => {
    await app.close();
    // await dataSource.destroy();
  });

  // afterEach((): void => {
  //   jest.clearAllMocks();
  // });

  describe("local signup", (): void => {
    describe("positive scenarios", (): void => {
      // it("should sign up a new user with local authentication", async (): Promise<void> => {});
    });

    describe("negative scenarios", (): void => {
      it("should return 400 when signing up with an already used email", async (): Promise<void> => {
        const user: UserEntity = await factories.buildUser();

        const payload = {
          username: user.username,
          email: user.email,
          password: "FT8ttjJI",
        };

        const response = await httpServer.post("/api/v1/auth/local/signup").send(payload);

        expect(response.statusCode).toBe(400);
      });
    });
  });
});
