export default interface GoogleOAuth2 {
  authorizationParams: {
    access_type: string;
    prompt: string;
  };
  userProfile: {
    userName: string;
    firstName: string | undefined;
    lastName: string | undefined;
    email: string;
    avatarUrl: string | undefined;
  };
  userIdPTokens: {
    accessToken: string;
    refreshToken: string | undefined;
  };
}
