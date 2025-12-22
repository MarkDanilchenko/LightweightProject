import { Test, TestingModule } from "@nestjs/testing";
import UsersController from "@server/users/users.controller";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { buildUserFakeFactory } from "../factories";

describe("UsersController", (): void => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;
  let mockUser: UserEntity;

  beforeAll((): void => {
    mockUser = buildUserFakeFactory();
  });

  beforeEach(async (): Promise<void> => {
    const mockUsersService = {
      findUserByPk: jest.fn(),
      findUser: jest.fn(),
      updateUser: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = testingModule.get<UsersController>(UsersController);
    service = testingModule.get<UsersService>(UsersService) as jest.Mocked<UsersService>;
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
