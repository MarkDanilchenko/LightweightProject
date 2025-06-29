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
   * @param userId - The ID of the user to find.
   * @param options - Additional find options to customize the query.
   *
   * @returns A promise that resolves with the user entity if found, otherwise null.
   */
  async findByPk(userId: string, options?: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
    options = { ...options, where: { ...options?.where, id: userId } };

    return this.userRepository.findOne(options);
  }
}
