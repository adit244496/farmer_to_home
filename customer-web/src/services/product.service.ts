import api from '@/lib/api'
import type { Product, PaginatedResponse } from '@/types'

export interface ProductSearchParams {
  q?: string          // full-text search (Marathi / Hindi / English)
  search?: string     // kept for legacy callers; mapped to q
  category?: string
  is_organic?: boolean
  ordering?: string
  page?: number
  page_size?: number
  farmer_id?: number
}

export interface CategoryItem {
  id: string
  name_en: string
  name_mr: string
  slug: string
  icon_url?: string
  is_active: boolean
}

const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'veg', name_en: 'Vegetables', name_mr: 'भाज्या', slug: 'Vegetables', icon_url: undefined, is_active: true },
  { id: 'fruit', name_en: 'Fruits', name_mr: 'फळे', slug: 'Fruits', icon_url: undefined, is_active: true },
  { id: 'grain', name_en: 'Grains', name_mr: 'धान्य', slug: 'Grains', icon_url: undefined, is_active: true },
  { id: 'dairy', name_en: 'Dairy', name_mr: 'दुग्धजन्य', slug: 'Dairy', icon_url: undefined, is_active: true },
  { id: 'spice', name_en: 'Spices', name_mr: 'मसाले', slug: 'Spices', icon_url: undefined, is_active: true },
  { id: 'org', name_en: 'Organic', name_mr: 'सेंद्रिय', slug: 'Organic', icon_url: undefined, is_active: true },
]

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables: '🥦', fruits: '🍎', grains: '🌾', dairy: '🥛',
  spices: '🌶️', organic: '🌿', other: '🛒',
}

export function getCategoryEmoji(slug: string): string {
  return CATEGORY_EMOJIS[slug.toLowerCase()] ?? '🛒'
}

export const productService = {
  searchProducts: async (params: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
    // Normalise: legacy `search` field → `q` which the backend expects
    const { search, ...rest } = params
    const normalised = { ...rest, ...(search && !rest.q ? { q: search } : {}) }
    const response = await api.get('/products/', { params: normalised })
    return response.data
  },

  getProductDetail: async (id: string | number): Promise<Product> => {
    const response = await api.get(`/products/${id}/`)
    return response.data
  },

  getProductReviews: async (id: string | number, page = 1) => {
    const response = await api.get(`/products/${id}/reviews/`, { params: { page } })
    return response.data
  },

  getSimilarProducts: async (id: string | number): Promise<Product[]> => {
    const response = await api.get(`/products/${id}/similar/`)
    return response.data?.results ?? response.data ?? []
  },

  getTrendingProducts: async (is_organic?: boolean): Promise<Product[]> => {
    const response = await api.get('/products/', {
      params: { ordering: '-total_ratings', page_size: 10, ...(is_organic ? { is_organic: true } : {}) },
    })
    return response.data?.results ?? []
  },

  getTodayPicks: async (is_organic?: boolean): Promise<Product[]> => {
    const response = await api.get('/products/', {
      params: { ordering: '-created_at', page_size: 10, ...(is_organic ? { is_organic: true } : {}) },
    })
    return response.data?.results ?? []
  },

  getOrganicProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products/', {
      params: { is_organic: true, ordering: '-total_ratings', page_size: 10 },
    })
    return response.data?.results ?? []
  },

  getCategories: async (): Promise<CategoryItem[]> => {
    try {
      const response = await api.get('/categories/')
      const data: CategoryItem[] = response.data?.results ?? response.data ?? []
      return data.length > 0 ? data : FALLBACK_CATEGORIES
    } catch {
      return FALLBACK_CATEGORIES
    }
  },

  getFarmerProducts: async (farmerId: number, params?: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products/', { params: { ...params, farmer_id: farmerId } })
    return response.data
  },
}
