import UserEntity from "@server/user/user.entity";
import { TokenPayload } from "@server/common/interfaces/common.interfaces";

type RequestWithUser = Request & { user: UserEntity };

type RequestWithTokenPayload = Request & { tokenPayload: TokenPayload };

type RequestWithSignedCookies = Request & { signedCookies: Record<string, string> };

export { RequestWithUser, RequestWithSignedCookies, RequestWithTokenPayload };
