import { ApiTags } from "@nestjs/swagger";
import UserService from "./user.service.js";

@ApiTags("users")
export default class UserController {
  constructor(private readonly userService: UserService) {}
}
