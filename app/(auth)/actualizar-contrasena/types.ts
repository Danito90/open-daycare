export type UpdatePasswordState = {
  errors?: {
    password?: string;
    passwordConfirmation?: string;
  };
  formError?: string;
};
