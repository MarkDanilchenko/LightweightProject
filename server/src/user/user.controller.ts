import { ApiTags } from "@nestjs/swagger";
import { Controller } from "@nestjs/common";
import UserService from "@server/user/user.service";

@ApiTags("users")
@Controller("users")
export default class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }
}
