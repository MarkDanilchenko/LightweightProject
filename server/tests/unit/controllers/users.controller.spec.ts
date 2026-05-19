/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import UsersController from "#server/users/users.controller";
import UsersService from "#server/users/users.service";
import { Response } from "express";
import UserEntity from "#server/users/users.entity";
import { buildUserFactory } from "../../factories";
import { UserDeactivateDto, UserDeleteDto } from "#server/auth/dto/auth.dto";
import { clearCookie } from "#server/utils/cookie";
import { RequestWithTokenPayload } from "#server/common/types/common.types";
import { v4 as uuidv4 } from "uuid";

jest.mock("#server/utils/cookie", () => ({
  clearCookie: jest.fn(),
}));

describe("UsersController", (): void => {
  const mockUser: UserEntity = buildUserFactory();
  let usersController: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let mockResponse: Response;

  beforeEach(async (): Promise<void> => {
    const mockUsersService = {
      findUserByPk: jest.fn(),
      findUser: jest.fn(),
      updateUser: jest.fn(),
      deactivateUserProfile: jest.fn(),
      deleteUserProfile: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    usersController = testingModule.get<UsersController>(UsersController);
    usersService = testingModule.get<jest.Mocked<UsersService>>(UsersService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(usersController).toBeDefined();
  });

  describe("deactivateUser", (): void => {
    it("should call authService.deactivateUserProfile, clear cookie, and return 200", async (): Promise<void> => {
      const userDeactivateDto: UserDeactivateDto = { confirmationWord: "deactivate" };
      const req = {
        tokenPayload: { userId: mockUser.id, provider: "local", jwti: uuidv4() },
      } as RequestWithTokenPayload;

      await usersController.deactivateUser(req, userDeactivateDto, mockResponse);

      expect(usersService.deactivateUserProfile).toHaveBeenCalledWith(req.tokenPayload, userDeactivateDto);
      expect(clearCookie).toHaveBeenCalledWith(mockResponse, "accessToken");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({ message: "User's profile deactivated successfully." });
    });
  });

  describe("deleteUser", (): void => {
    it("should call authService.deleteUserProfile, clear cookie, and return 200", async (): Promise<void> => {
      const userDeleteDto: UserDeleteDto = { confirmationWord: "delete" };
      const req = {
        tokenPayload: { userId: mockUser.id, provider: "local", jwti: uuidv4() },
      } as RequestWithTokenPayload;

      await usersController.deleteUser(req, userDeleteDto, mockResponse);

      expect(usersService.deleteUserProfile).toHaveBeenCalledWith(req.tokenPayload, userDeleteDto);
      expect(clearCookie).toHaveBeenCalledWith(mockResponse, "accessToken");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith({ message: "User's profile deleted successfully." });
    });
  });
});
