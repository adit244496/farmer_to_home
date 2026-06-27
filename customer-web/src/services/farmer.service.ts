import api from '@/lib/api'
import type { Farmer, Review, PaginatedResponse } from '@/types'

export const farmerService = {
  getPublicProfile: async (id: string | number): Promise<Farmer> => {
    const response = await api.get(`/farmers/${id}/`)
    return response.data
  },

  getReviews: async (id: string | number, page = 1): Promise<PaginatedResponse<Review>> => {
    try {
      const response = await api.get(`/farmers/${id}/reviews/`, { params: { page } })
      return response.data
    } catch {
      return { items: [], results: [], total: 0, page: 1, page_size: 10, pages: 0 }
    }
  },
}
