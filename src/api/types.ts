export interface PlayerSimple {
  pk: number;
  name: string;
  lastname: string;
  nickname: string;
  age: number | null;
  full_name: string;
  gender: string;
  is_paired: boolean;
}

export interface User {
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_authorized: boolean;
  player: PlayerSimple | null;
}
