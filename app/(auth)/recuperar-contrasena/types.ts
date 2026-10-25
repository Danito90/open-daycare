export type RequestResetState = {
  errors?: {
    email?: string;
  };
  formError?: string;
  sent?: boolean;
};
