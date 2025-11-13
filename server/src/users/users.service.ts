import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import UserEntity from "@server/users/users.entity";

@Injectable()
export default class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

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
}
