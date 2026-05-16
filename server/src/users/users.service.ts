import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import UserEntity from "#server/users/users.entity";
import AuthenticationEntity from "#server/auth/auth.entity";
import { RMQ_MICROSERVICE } from "#server/configs/constants";
import { EventName } from "#server/events/interfaces/events.interfaces";
import EventsService from "#server/events/events.service";
import TokensService from "#server/tokens/tokens.service";
import { TokenPayload } from "#server/tokens/interfaces/token.interfaces";
import { UserDeactivateDto, UserDeleteDto } from "#server/auth/dto/auth.dto";

@Injectable()
export default class UsersService {
  private readonly dataSource: DataSource;
  private readonly tokensService: TokensService;
  private readonly eventsService: EventsService;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject(RMQ_MICROSERVICE)
    private readonly rmqMicroserviceClient: ClientProxy,
    tokensService: TokensService,
    eventsService: EventsService,
  ) {
    this.dataSource = dataSource;
    this.tokensService = tokensService;
    this.eventsService = eventsService;
  }

  /**
   * Finds a users entity by its primary key (users ID).
   *
   * @param {string} userId - The ID of the users to find.
   * @param {EntityManager} [manager] - The entity manager to use for the query within a transaction.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the users entity if found, otherwise null.
   */
  async findUserByPk(userId: string, manager?: EntityManager): Promise<UserEntity | null> {
    if (!manager) {
      return this.userRepository.findOneBy({ id: userId });
    }

    return manager.findOne(UserEntity, { where: { id: userId } });
  }

  /**
   * Finds a single user's entity.
   *
   * @param {FindOneOptions<UserEntity>} options - Additional find options to customize the query.
   * @param {EntityManager} [manager] - The entity manager to use for the query within a transaction.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the users entity if found, otherwise null.
   */
  async findUser(options: FindOneOptions<UserEntity>, manager?: EntityManager): Promise<UserEntity | null> {
    if (!manager) {
      return this.userRepository.findOne(options);
    }

    return manager.findOne(UserEntity, options);
  }

  /**
   * Updates a users entity with the given values.
   *
   * @param {FindOptionsWhere<UserEntity>} whereCondition - The condition to find the users entity to update.
   * @param {Record<string, unknown>} values - The values to update the users entity with.
   * @param {EntityManager} [manager] - The entity manager to use for the query within a transaction.
   *
   * @returns {Promise<UpdateResult>} A promise that resolves with the update result.
   */
  async updateUser(
    whereCondition: FindOptionsWhere<UserEntity>,
    values: Partial<UserEntity>,
    manager?: EntityManager,
  ): Promise<UpdateResult> {
    if (!manager) {
      return this.userRepository.update(whereCondition, values);
    }

    return manager.update(UserEntity, whereCondition, values);
  }

  /**
   * Soft deletes a user by marking it with deletedAt.
   *
   * @param {FindOptionsWhere<UserEntity>} whereCondition - The condition to find the user to softly delete.
   * @param {EntityManager} [manager] - The entity manager to use for the query within a transaction.
   *
   * @returns {Promise<UpdateResult>} A promise that resolves with the update result.
   */
  async deleteUserSoft(whereCondition: FindOptionsWhere<UserEntity>, manager?: EntityManager): Promise<UpdateResult> {
    if (!manager) {
      return this.userRepository.softDelete(whereCondition);
    }

    return manager.softDelete(UserEntity, whereCondition);
  }

  /**
   * Deactivates user's profile.
   *
   * @param {TokenPayload} payload - The JWT token payload containing user authentication information.
   * @param {UserDeactivateDto} userDeactivateDto - The DTO containing the confirmation word.
   *
   * @returns {Promise<void>} A promise that resolves when the profile is successfully deactivated.
   */
  async deactivateUserProfile(payload: TokenPayload, userDeactivateDto: UserDeactivateDto): Promise<void> {
    const { confirmationWord } = userDeactivateDto;
    if (confirmationWord !== "deactivate") {
      throw new BadRequestException("Deactivation failed. Invalid confirmation word.");
    }

    const { userId, jwti, exp } = payload;
    if (!jwti || !exp) {
      throw new UnauthorizedException("Token is invalid.");
    }

    const user: UserEntity | null = await this.findUser({
      relations: ["authentications"],
      select: {
        id: true,
        isDeactivated: true,
        email: true,
        username: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: { id: userId },
    });
    if (!user || !user.authentications.length) {
      throw new UnauthorizedException("User is not found.");
    }

    if (user.isDeactivated) {
      throw new BadRequestException("User's profile is already deactivated.");
    }

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateUser({ id: user.id }, { isDeactivated: true }, manager);
      await manager.update(
        AuthenticationEntity,
        { userId: user.id },
        {
          refreshToken: null,
          lastAccessedAt: () => "lastAccessedAt",
        },
      );
      await this.tokensService.addToBlacklist(jwti, exp);

      this.rmqMicroserviceClient.emit(
        EventName.USER_DEACTIVATED,
        this.eventsService.buildInstance(EventName.USER_DEACTIVATED, user.id, user.id, {
          email: user.email,
          username: user.username,
        }),
      );
    });
  }

  /**
   * Deletes a user's profile.
   * Cron job deletes it permanently and anonymize its data after 30 days.
   *
   * @param {TokenPayload} payload - The JWT token payload containing user authentication information.
   * @param {UserDeleteDto} userDeleteDto - The DTO containing the confirmation word.
   *
   * @returns {Promise<void>} A promise that resolves when the profile is successfully deleted.
   */
  async deleteUserProfile(payload: TokenPayload, userDeleteDto: UserDeleteDto): Promise<void> {
    const { confirmationWord } = userDeleteDto;
    if (confirmationWord !== "delete") {
      throw new BadRequestException("Deletion failed. Invalid confirmation word.");
    }

    const { userId, jwti, exp } = payload;
    if (!jwti || !exp) {
      throw new UnauthorizedException("Token is invalid.");
    }

    const user: UserEntity | null = await this.findUser({
      relations: ["authentications"],
      select: {
        id: true,
        email: true,
        username: true,
        deletedAt: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: { id: userId },
    });
    if (!user || !user.authentications.length) {
      throw new UnauthorizedException("User is not found.");
    }

    if (user.deletedAt) {
      throw new BadRequestException("User's profile is already deleted.");
    }

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.deleteUserSoft({ id: user.id }, manager);
      await manager.update(
        AuthenticationEntity,
        { userId: user.id },
        {
          refreshToken: null,
          lastAccessedAt: () => "lastAccessedAt",
        },
      );
      await this.tokensService.addToBlacklist(jwti, exp);

      this.rmqMicroserviceClient.emit(
        EventName.USER_DELETED,
        this.eventsService.buildInstance(EventName.USER_DELETED, user.id, user.id, {
          email: user.email,
          username: user.username,
        }),
      );
    });
  }
}
