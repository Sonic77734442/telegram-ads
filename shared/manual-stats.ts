export function numberInput(value: string): number {
  const normalized = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  return normalized && /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}
export function checkDailyStats(views: number, clicks: number, cpm: number, budget: number, dailyBudget: number, otherSpend: number) {
  const errors: string[] = [];
  if (!Number.isInteger(views) || views < 0 || views > 2147483647) errors.push('Показы должны быть целым неотрицательным числом.');
  if (!Number.isInteger(clicks) || clicks < 0 || clicks > views) errors.push('Клики должны быть целым числом от 0 до количества показов.');
  if (!Number.isFinite(cpm) || cpm < 0 || (views > 0 && cpm === 0)) errors.push('Укажите положительный CPM.');
  if (![budget, dailyBudget, otherSpend].every(n => Number.isFinite(n) && n >= 0)) errors.push('Не удалось определить бюджет или ранее внесённый расход.');
  const spend = views * cpm / 1000;
  const total = otherSpend + spend;
  // Compare rounded cents, matching the money displayed to the operator.
  if (Number.isFinite(total) && Math.round(total * 100) > Math.round(budget * 100)) errors.push(`Не соответствует общему бюджету: превышение €${(total-budget).toFixed(2)}.`);
  if (dailyBudget > 0 && Math.round(spend * 100) > Math.round(dailyBudget * 100)) errors.push(`Не соответствует дневному бюджету: превышение €${(spend-dailyBudget).toFixed(2)}.`);
  return {errors, spend, total, remaining: budget-total};
}
