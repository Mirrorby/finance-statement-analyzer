export interface Transaction {
  date: Date;
  category: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
  bank: string;
}
