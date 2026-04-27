import { Body, Controller, Post, Req, Res, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiCookieAuth } from "@nestjs/swagger";
import { Response } from "express";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import UsersService from "#server/users/users.service";
import { DeactivateDto } from "#server/auth/dto/auth.dto";
import { clearCookie } from "#server/utils/cookie";
import JwtGuard from "#server/auth/guards/jwt.guard";
import { RequestWithTokenPayload } from "#server/common/types/common.types";
import { TokenPayload } from "#server/tokens/interfaces/token.interfaces";

@ApiTags("users")
@Controller("users")
export default class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }

  @Post("deactivate")
  @ApiOperation({
    summary: "Deactivate user profile",
    description: "Deactivate current user's profile until the next login.",
  })
  @ApiResponse({
    status: 200,
    description: "User profile deactivated successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiCookieAuth("accessToken")
  @ApiBody({ type: DeactivateDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(JwtGuard)
  async deactivateUser(
    @Req() req: RequestWithTokenPayload,
    @Body() deactivateDto: DeactivateDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const payload: TokenPayload = req.tokenPayload;

    await this.usersService.deactivateUser(payload, deactivateDto);

    clearCookie(res, "accessToken");

    res.status(200).send({ message: "User profile deactivated successfully." });
  }
}
