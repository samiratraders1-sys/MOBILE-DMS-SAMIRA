export const toFloat = (val: any): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

export const safeSum = (arr: any[], key: string): number => {
  return arr.reduce((sum, item) => sum + toFloat(item[key]), 0);
};

export const roundCurrency = (val: number): number => {
  return Math.round(val * 100) / 100;
};
