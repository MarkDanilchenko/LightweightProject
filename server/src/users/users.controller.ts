import { Body, Controller, Delete, Post, Req, Res, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiCookieAuth } from "@nestjs/swagger";
import { Response } from "express";
import { ZodValidationPipe } from "@anatine/zod-nestjs";
import UsersService from "#server/users/users.service";
import { UserDeactivateDto, UserDeleteDto } from "#server/auth/dto/auth.dto";
import { clearCookie } from "#server/utils/cookie";
import JwtGuard from "#server/auth/guards/jwt.guard";
import { RequestWithTokenPayload } from "#server/common/types/common.types";

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
  @ApiCookieAuth("accessToken")
  @ApiBody({ type: UserDeactivateDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(JwtGuard)
  async deactivateUser(
    @Req() req: RequestWithTokenPayload,
    @Body() userDeactivateDto: UserDeactivateDto,
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
  @ApiCookieAuth("accessToken")
  @ApiBody({ type: UserDeleteDto })
  @UsePipes(ZodValidationPipe)
  @UseGuards(JwtGuard)
  async deleteUser(
    @Req() req: RequestWithTokenPayload,
    @Body() userDeleteDto: UserDeleteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.usersService.deleteUserProfile(req.tokenPayload, userDeleteDto);

    clearCookie(res, "accessToken");

    res.status(200).send({ message: "User's profile deleted successfully." });
  }
}
