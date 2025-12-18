import { faker } from "@faker-js/faker";
import UserEntity from "@server/users/users.entity";

// function buildUserFactory(userProps?: Partial<UserEntity>): UserEntity {
//   return;
// }

function buildUserFakeFactory(): UserEntity {
  const user = new UserEntity();

  user.id = faker.string.uuid();
  user.email = faker.internet.email();
  user.firstName = faker.person.firstName();
  user.lastName = faker.person.lastName();
  user.username = faker.string.alphanumeric(10);
  user.avatarUrl = faker.image.avatar();
  user.createdAt = faker.date.past();
  user.updatedAt = faker.date.recent();
  user.deletedAt = null;

  return user;
}

export { buildUserFakeFactory };
