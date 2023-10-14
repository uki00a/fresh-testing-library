export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Users {
  all(): Promise<Array<User>>;
  getByID(id: number): Promise<User>;
}
