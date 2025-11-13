interface TokenPayload {
  jwti?: string;
  userId?: string;
  provider?: string;
  iat?: number;
  ext?: number;
}

export { TokenPayload };
