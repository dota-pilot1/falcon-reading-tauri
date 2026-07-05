export type RoleSummary = {
  id: number;
  code: string;
  name: string;
};

export type UserSummary = {
  id: number;
  email: string;
  username: string;
  role: RoleSummary;
  permissions: string[];
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSec: number;
  user: UserSummary;
};
