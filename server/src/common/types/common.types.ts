import UserEntity from "@server/users/users.entity";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";

type RequestWithUser = Request & { user: UserEntity };

type RequestWithTokenPayload = Request & { tokenPayload: TokenPayload };

type RequestWithSignedCookies = Request & { signedCookies: Record<string, string> };

export { RequestWithUser, RequestWithSignedCookies, RequestWithTokenPayload };
