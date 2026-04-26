import { ApiTags } from "@nestjs/swagger";
import { Controller } from "@nestjs/common";

@ApiTags("users")
@Controller("users")
export default class UsersController {
  constructor() {}
}
