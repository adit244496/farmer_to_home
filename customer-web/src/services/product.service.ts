import api from '@/lib/api'
import type { Product, PaginatedResponse } from '@/types'

export interface ProductSearchParams {
  search?: string
  category?: string
  is_organic?: boolean
  ordering?: string
  page?: number
  page_size?: number
  farmer_id?: number
}

export const productService = {
  searchProducts: async (params: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products/', { params })
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

  getTrendingProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products/', { params: { ordering: '-total_ratings', page_size: 10 } })
    return response.data?.results ?? []
  },

  getTodayPicks: async (): Promise<Product[]> => {
    const response = await api.get('/products/', { params: { ordering: '-created_at', page_size: 10 } })
    return response.data?.results ?? []
  },

  getCategories: async (): Promise<{ id: string; name: string; icon?: string }[]> => {
    try {
      const response = await api.get('/categories/')
      return response.data?.results ?? response.data ?? []
    } catch {
      return []
    }
  },

  getFarmerProducts: async (farmerId: number, params?: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products/', { params: { ...params, farmer_id: farmerId } })
    return response.data
  },
}
