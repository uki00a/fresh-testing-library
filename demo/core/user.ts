export interface User {
  name: string;
  email: string;
}

export interface Users {
  all(): Promise<Array<User>>;
  getByID(id: number): Promise<User>;
}
