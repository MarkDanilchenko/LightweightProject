import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, Repository } from "typeorm";
import UserEntity from "@server/user/user.entity";

@Injectable()
export default class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Finds a user entity by its primary key (user ID).
   *
   * @param userId {string} - The ID of the user to find.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the user entity if found, otherwise null.
   */
  async findUserByPk(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ id: userId });
  }

  /**
   * Finds a single user entity.
   *
   * @param options {FindOneOptions<UserEntity>} - Additional find options to customize the query.
   *
   * @returns {Promise<UserEntity | null>} A promise that resolves with the user entity if found, otherwise null.
   */
  async findUser(options: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOne(options);
  }
}
