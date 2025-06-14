export default interface GoogleOAuth2Strategy {
  authorizationParams: {
    access_type: string;
    prompt: string;
  };

  userProfile: {
    firstName: string | undefined;
    lastName: string | undefined;
    email: string | undefined;
    avatarUrl: string | undefined;
  };

  userTokens: {
    accessToken: string;
    refreshToken: string;
  };
  // eslint-disable-next-line semi
}
