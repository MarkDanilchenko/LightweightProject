import { INestApplication } from "@nestjs/common";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import { DataSource } from "typeorm";
import TestAgent from "supertest/lib/agent";
import { bootstrapMainTestApp } from "./bootstrapMainTestApp";
import request from "supertest";

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
  const appConfiguration: AppConfiguration = {
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

describe("HealthController E2E", (): void => {
  let app: INestApplication;
  let dataSource: DataSource;
  let httpServer: TestAgent;

  beforeAll(async (): Promise<void> => {
    app = await bootstrapMainTestApp();
    dataSource = app.get(DataSource);
    httpServer = request(app.getHttpServer());
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  afterAll(async (): Promise<void> => {
    await dataSource.destroy();
    await app.close();
  });

  describe("GET /api/v1/health", (): void => {
    describe("positive scenarios", (): void => {
      it("should return 200 and ok status without authentication token (public route)", async (): Promise<void> => {
        const response = await httpServer.get("/api/v1/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.body).toHaveProperty("info");
        expect(response.body).toHaveProperty("error");
        expect(response.body).toHaveProperty("details");

        expect(response.body.info).toHaveProperty("database");
        expect(response.body.info).toHaveProperty("redis");
        expect(response.body.info).toHaveProperty("rabbitmq");
        expect(response.body.info.database.status).toBe("up");
        expect(response.body.info.redis.status).toBe("up");
        expect(response.body.info.rabbitmq.status).toBe("up");
      });
    });

    describe("negative scenarios", (): void => {
      it("should not return 401 even if invalid cookie is sent because route is public", async (): Promise<void> => {
        const response = await httpServer.get("/api/v1/health").set("Cookie", "accessToken=invalid-token");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
      });
    });
  });
});
