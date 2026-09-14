import type { Expense } from '../types/index.ts';

export interface UserExpenseShare {
  user_id: string;
  subtotal: number;
  service_charge: number;
  tax: number;
  total: number;
}

export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates each user's exact share of an expense, including item assignments,
 * proportional service charge, and proportional or equal tax distribution.
 */
export function calculateExpenseShares(expense: Expense): UserExpenseShare[] {
  const assignments = expense.assignments || [];
  const userIds = Array.from(new Set(assignments.map(a => a.user_id)));
  if (userIds.length === 0) {
    return [];
  }

  const subtotals: Record<string, number> = {};
  userIds.forEach(uid => {
    subtotals[uid] = 0;
  });

  if (expense.items && expense.items.length > 0) {
    expense.items.forEach(item => {
      const itemAssignments = assignments.filter(a => a.item_id === item.id);
      const totalPercentage = itemAssignments.reduce((sum, a) => sum + a.percentage, 0);

      if (totalPercentage > 0) {
        itemAssignments.forEach(a => {
          const portion = (a.percentage / totalPercentage) * item.amount;
          subtotals[a.user_id] = (subtotals[a.user_id] || 0) + portion;
        });
      }
    });
  } else {
    const equalShare = expense.amount / userIds.length;
    userIds.forEach(uid => {
      subtotals[uid] = equalShare;
    });
  }

  const totalSubtotal = Object.values(subtotals).reduce((sum, val) => sum + val, 0);

  let serviceChargeTotal = 0;
  if (expense.include_service_charge && expense.service_charge_percent > 0) {
    serviceChargeTotal = totalSubtotal * (expense.service_charge_percent / 100);
  }

  let taxTotal = 0;
  if (expense.include_tax && expense.tax_percent > 0) {
    taxTotal = totalSubtotal * (expense.tax_percent / 100);
  }

  return userIds.map(uid => {
    const userSubtotal = subtotals[uid] || 0;
    const proportion = totalSubtotal > 0 ? userSubtotal / totalSubtotal : 1 / userIds.length;

    const userServiceCharge = roundToCents(serviceChargeTotal * proportion);

    const userTax = expense.split_tax_equally
      ? roundToCents(taxTotal / userIds.length)
      : roundToCents(taxTotal * proportion);

    const userTotal = roundToCents(userSubtotal + userServiceCharge + userTax);

    return {
      user_id: uid,
      subtotal: roundToCents(userSubtotal),
      service_charge: userServiceCharge,
      tax: userTax,
      total: userTotal,
    };
  });
}

export const calculateItemizedSplit = calculateExpenseShares;
