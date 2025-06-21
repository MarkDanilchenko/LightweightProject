import { ApiTags } from "@nestjs/swagger";
import UserService from "./user.service.js";
import { Controller } from "@nestjs/common";

@ApiTags("users")
@Controller("users")
export default class UserController {
  constructor(private readonly userService: UserService) {}
}
