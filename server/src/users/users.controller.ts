import { ApiTags } from "@nestjs/swagger";
import { Controller } from "@nestjs/common";
import UsersService from "@server/users/users.service";

@ApiTags("users")
@Controller("users")
export default class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }
}
