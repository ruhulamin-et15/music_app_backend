export interface ILogin {
  email: string;
  password: string;
}

export interface IProfileUpdate {
  username?: string;
}

export interface IOtp {
  email: string;
  otp: string;
}
