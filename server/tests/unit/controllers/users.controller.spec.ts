import { Test, TestingModule } from "@nestjs/testing";
import UsersController from "@server/users/users.controller";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { buildUserFactory } from "../../factories";

describe("UsersController", (): void => {
  const mockUser: UserEntity = buildUserFactory();
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async (): Promise<void> => {
    const mockUsersService = {
      findUserByPk: jest.fn(),
      findUser: jest.fn(),
      updateUser: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = testingModule.get<UsersController>(UsersController);
    service = testingModule.get<jest.Mocked<UsersService>>(UsersService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(mockUser).toBeDefined();
  });
});
