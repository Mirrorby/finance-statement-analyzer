import { Transaction } from '../types/transaction';

export function calculateAnalytics(transactions: Transaction[]) {
  const totalIncome = transactions.reduce((s, t) => s + t.income, 0);
  const totalExpense = transactions.reduce((s, t) => s + t.expense, 0);

  const categories: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.expense > 0) {
      categories[t.category] = (categories[t.category] || 0) + t.expense;
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categories: Object.entries(categories).map(([name, amount]) => ({
      name,
      amount
    }))
  };
}
