import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import UserEntity from "@server/users/users.entity";

@Injectable()
export default class UsersService {
  private readonly dataSource: DataSource;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    this.dataSource = dataSource;
  }

  /**
   * Finds a users entity by its primary key (users ID).
   *
   * @param {string} userId - The ID of the users to find.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the users entity if found, otherwise null.
   */
  async findUserByPk(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ id: userId });
  }

  /**
   * Finds a single user's entity.
   *
   * @param {FindOneOptions<UserEntity>} options - Additional find options to customize the query.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the users entity if found, otherwise null.
   */
  async findUser(options: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOne(options);
  }

  /**
   * Updates a users entity with the given values.
   *
   * @param {FindOptionsWhere<UserEntity>} whereCondition - The condition to find the users entity to update.
   * @param {Record<string, unknown>} values - The values to update the users entity with.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<UpdateResult>} A promise that resolves with the update result.
   */
  async updateUser(
    whereCondition: FindOptionsWhere<UserEntity>,
    values: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<UpdateResult> {
    const callback = async (manager: EntityManager): Promise<UpdateResult> => {
      return manager.update(UserEntity, whereCondition, values);
    };

    if (!manager) {
      return this.dataSource.transaction(callback);
    }

    return callback(manager);
  }
}
