export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(date: string, lang: 'en' | 'mr' = 'en'): string {
  return new Date(date).toLocaleDateString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: string, lang: 'en' | 'mr' = 'en'): string {
  return new Date(date).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    confirmed: 'text-blue-600 bg-blue-50',
    packed: 'text-indigo-600 bg-indigo-50',
    dispatched: 'text-purple-600 bg-purple-50',
    delivered: 'text-green-600 bg-green-50',
    completed: 'text-green-700 bg-green-100',
    cancelled: 'text-red-600 bg-red-50',
  }
  return map[status] ?? 'text-gray-600 bg-gray-50'
}

export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function getProductName(product: { name_en: string; name_mr: string }, lang: 'en' | 'mr'): string {
  return lang === 'mr' ? product.name_mr || product.name_en : product.name_en
}

export function getProductDescription(
  product: { description_en?: string; description_mr?: string },
  lang: 'en' | 'mr'
): string {
  return lang === 'mr'
    ? product.description_mr || product.description_en || ''
    : product.description_en || ''
}

export function getPrimaryImage(images: { image_url: string; is_primary: boolean }[]): string | undefined {
  return images.find((img) => img.is_primary)?.image_url ?? images[0]?.image_url
}
