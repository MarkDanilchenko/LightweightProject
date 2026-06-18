import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export default class GitHubOAuth2Guard extends AuthGuard("githubOAuth2") {}
