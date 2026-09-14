import type { Expense, Settlement, SimplifiedDebt, UserBalance } from '../types/index.ts';
import { calculateExpenseShares, roundToCents } from './split.ts';

/**
 * Calculates each member's total paid, total consumed/owed, and net balance
 * across all expenses and settlements in a trip.
 */
export function calculateTripBalances(
  expenses: Expense[],
  settlements: Settlement[] = [],
  baseCurrency: string
): UserBalance[] {
  const balanceMap: Record<string, { paid: number; owed: number }> = {};

  const ensureUser = (userId: string) => {
    if (!balanceMap[userId]) {
      balanceMap[userId] = { paid: 0, owed: 0 };
    }
  };

  expenses.forEach(expense => {
    const rate = expense.exchange_rate || 1;
    const paidBy = expense.paid_by_user_id;
    ensureUser(paidBy);
    balanceMap[paidBy].paid += expense.amount * rate;

    const shares = calculateExpenseShares(expense);
    shares.forEach(share => {
      ensureUser(share.user_id);
      balanceMap[share.user_id].owed += share.total * rate;
    });
  });

  settlements
    .filter(s => s.status === 'completed')
    .forEach(s => {
      ensureUser(s.from_user_id);
      ensureUser(s.to_user_id);
      balanceMap[s.from_user_id].paid += s.amount;
      balanceMap[s.to_user_id].owed += s.amount;
    });

  return Object.entries(balanceMap).map(([userId, data]) => {
    const totalPaid = roundToCents(data.paid);
    const totalOwed = roundToCents(data.owed);
    const netBalance = roundToCents(totalPaid - totalOwed);

    return {
      user_id: userId,
      total_paid: totalPaid,
      total_owed: totalOwed,
      net_balance: netBalance,
    };
  });
}

/**
 * Simplifies group debts using a greedy bipartite matching algorithm.
 * Minimizes the total number of transfers needed to settle all debts.
 */
export function simplifyDebts(
  balances: UserBalance[],
  currency: string
): SimplifiedDebt[] {
  const debtors: { user_id: string; amount: number }[] = [];
  const creditors: { user_id: string; amount: number }[] = [];

  balances.forEach(b => {
    if (b.net_balance < -0.01) {
      debtors.push({ user_id: b.user_id, amount: Math.abs(b.net_balance) });
    } else if (b.net_balance > 0.01) {
      creditors.push({ user_id: b.user_id, amount: b.net_balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplified: SimplifiedDebt[] = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = roundToCents(settledAmount);

    if (roundedAmount > 0) {
      simplified.push({
        from_user_id: debtor.user_id,
        to_user_id: creditor.user_id,
        amount: roundedAmount,
        currency,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount < 0.01) {
      dIndex++;
    }
    if (creditor.amount < 0.01) {
      cIndex++;
    }
  }

  return simplified;
}
