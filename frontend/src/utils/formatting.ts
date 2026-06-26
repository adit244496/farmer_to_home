import { colors } from '../theme';

export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `₹${formatted}`;
};

export const formatDate = (date: string | Date, lang: 'en' | 'mr' = 'en'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'mr' ? 'mr-IN' : 'en-IN';
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string | Date, lang: 'en' | 'mr' = 'en'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'mr' ? 'mr-IN' : 'en-IN';
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatWeight = (value: number, unit: string): string => {
  const unitMap: Record<string, string> = {
    kg: 'kg',
    g: 'g',
    piece: 'piece',
    pieces: 'pieces',
    dozen: 'dozen',
    liter: 'L',
    litre: 'L',
    bundle: 'bundle',
    gram: 'g',
  };
  const displayUnit = unitMap[unit.toLowerCase()] || unit;
  return `${value} ${displayUnit}`;
};

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: '#F57F17',
    confirmed: colors.primary,
    packed: '#1565C0',
    dispatched: '#6A1B9A',
    delivered: colors.success,
    completed: colors.success,
    cancelled: colors.error,
    approved: colors.success,
    rejected: colors.error,
    suspended: colors.textMuted,
    active: colors.success,
    inactive: colors.textMuted,
    out_of_stock: colors.error,
    low_stock: colors.warning,
    paid: colors.success,
    unpaid: colors.error,
    refunded: '#6A1B9A',
  };
  return statusColors[status.toLowerCase()] || colors.textSecondary;
};

export const getStatusLabel = (status: string, t: (key: string) => string): string => {
  const statusMap: Record<string, string> = {
    pending: t('orders:pending'),
    confirmed: t('orders:confirmed'),
    packed: t('orders:packed'),
    dispatched: t('orders:dispatched'),
    delivered: t('orders:delivered'),
    completed: t('orders:completed'),
    cancelled: t('orders:cancelled'),
  };
  return statusMap[status.toLowerCase()] || status;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  return phone;
};

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const calculateDiscount = (original: number, discounted: number): number => {
  if (original === 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
};
