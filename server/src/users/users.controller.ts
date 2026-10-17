import { Body, Controller, Delete, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from "@nestjs/swagger";
import { Response } from "express";
import UsersService from "#server/users/users.service";
import { clearCookie } from "#server/utils/cookie";
import JwtGuard from "#server/auth/guards/jwt.guard";
import { RequestWithTokenPayload } from "#server/common/types/common.types";
import { UserDeactivateDto, UserDeleteDto } from "#server/users/dto/users.dto";
import { userDeactivateSchema, userDeleteSchema } from "#server/users/schemas/users.schemas";

@ApiTags("users")
@Controller("users")
export default class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }

  @Post("deactivate")
  @ApiOperation({
    summary: "Deactivate user's profile",
    description: "Deactivate current user's profile until the next login.",
  })
  @ApiResponse({
    status: 200,
    description: "User's profile deactivated successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async deactivateUser(
    @Req() req: RequestWithTokenPayload,
    @Body({ schema: userDeactivateSchema }) userDeactivateDto: UserDeactivateDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usersService.deactivateUserProfile(req.tokenPayload, userDeactivateDto);

    clearCookie(res, "accessToken");

    res.status(200).send({ message: "User's profile deactivated successfully." });
  }

  @Delete("delete")
  @ApiOperation({
    summary: "Delete user's profile",
    description: "Delete current user's profile and all associated data until the next login.",
  })
  @ApiResponse({
    status: 200,
    description: "User's profile deleted successfully.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request.",
  })
  @ApiResponse({
    status: 401,
    description: "Authentication failed. Invalid credentials.",
  })
  @ApiResponse({
    status: 404,
    description: "User not found.",
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests.",
  })
  @ApiCookieAuth("accessToken")
  @UseGuards(JwtGuard)
  async deleteUser(
    @Req() req: RequestWithTokenPayload,
    @Body({ schema: userDeleteSchema }) userDeleteDto: UserDeleteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usersService.deleteUserProfile(req.tokenPayload, userDeleteDto);

    clearCookie(res, "accessToken");

    res.status(200).send({ message: "User's profile deleted successfully." });
  }
}
