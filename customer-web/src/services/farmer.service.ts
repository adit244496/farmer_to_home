import api from '@/lib/api'
import type { Farmer } from '@/types'

export const farmerService = {
  getPublicProfile: async (id: string | number): Promise<Farmer> => {
    const response = await api.get(`/farmers/${id}/`)
    return response.data
  },
}
