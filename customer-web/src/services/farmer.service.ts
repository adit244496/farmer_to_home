import api from '@/lib/api'
import type { Farmer, Review, PaginatedResponse } from '@/types'

export const farmerService = {
  getPublicProfile: async (id: string | number): Promise<Farmer> => {
    const response = await api.get(`/farmers/${id}`)
    return response.data
  },

  getReviews: async (id: string | number, page = 1, rating?: number): Promise<PaginatedResponse<Review>> => {
    try {
      const params: Record<string, unknown> = { page }
      if (rating) params.rating = rating
      const response = await api.get(`/farmers/${id}/reviews`, { params })
      return response.data
    } catch {
      return { items: [], results: [], total: 0, page: 1, page_size: 10, pages: 0 }
    }
  },
}
