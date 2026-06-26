import apiClient from '../utils/api';
import { Product, ProductImage, Review, PaginatedResponse } from '../types';

// Maps raw backend API response to the frontend Product shape.
// Backend uses different field names (price vs price_per_unit, stock vs stock_quantity, etc.)
// and may return a flat primary_image string instead of an images array.
function isDiscountActive(discount: { valid_from?: string | null; valid_until?: string | null }): boolean {
  const now = new Date();
  if (discount.valid_from && now < new Date(discount.valid_from)) return false;
  if (discount.valid_until && now > new Date(discount.valid_until)) return false;
  return true;
}

function normalizeProduct(raw: any): Product {
  const images: ProductImage[] = [];
  if (raw.images?.length) {
    raw.images.forEach((img: any, i: number) => {
      images.push({
        id: img.id ?? i,
        image_url: img.image_url ?? img.url ?? '',
        is_primary: img.is_primary ?? (i === 0),
        order: img.order ?? img.display_order ?? i,
      });
    });
  } else if (raw.primary_image) {
    images.push({ id: 0, image_url: raw.primary_image, is_primary: true, order: 0 });
  }

  // Resolve discount — backend returns a nested `discount` object from the admin panel
  const basePrice: number = raw.price_per_unit ?? raw.price ?? 0;
  const activeDiscount = raw.discount && isDiscountActive(raw.discount) ? raw.discount : null;
  const discountPct: number | undefined = activeDiscount?.discount_percent ?? raw.discount_percent ?? undefined;
  const finalPrice: number = discountPct ? basePrice - (basePrice * discountPct) / 100 : basePrice;
  const originalPrice: number | undefined = discountPct ? basePrice : (raw.original_price ?? undefined);

  return {
    id: raw.id,
    name_en: raw.name_en,
    name_mr: raw.name_mr,
    description_en: raw.description_en,
    description_mr: raw.description_mr,
    category: raw.category_slug ?? raw.category ?? '',
    price_per_unit: finalPrice,
    unit: raw.unit,
    min_order_qty: raw.min_order_qty ?? 1,
    stock_quantity: raw.stock_quantity ?? raw.stock ?? 0,
    is_organic: raw.is_organic ?? false,
    is_active: raw.status === 'ACTIVE' || raw.status === 'active' || raw.is_active === true,
    original_price: originalPrice,
    discount_percent: discountPct,
    delivery_mins: raw.delivery_mins,
    harvest_date: raw.harvest_date,
    best_before_date: raw.best_before_date,
    images,
    tags: raw.tags ?? [],
    benefits: raw.benefits ?? [],
    rating: raw.rating ?? 0,
    total_ratings: raw.total_ratings ?? 0,
    created_at: raw.created_at,
    farmer: {
      id: raw.farmer?.id ?? raw.farmer_id ?? 0,
      full_name: raw.farmer?.full_name ?? raw.farmer?.name ?? raw.farmer?.user?.full_name ?? raw.farmer_name ?? '',
      district: raw.farmer?.district ?? raw.farmer_district ?? '',
      village: raw.farmer?.village ?? '',
      rating: raw.farmer?.rating ?? 0,
      total_ratings: raw.farmer?.total_ratings ?? 0,
      profile_photo: raw.farmer?.profile_photo ?? raw.farmer?.avatar ?? undefined,
    },
  };
}

export interface ProductSearchParams {
  q?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  is_organic?: boolean;
  farmer_district?: string;
  sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'top_rated';
  page?: number;
  page_size?: number;
}

export const productService = {
  searchProducts: async (params: ProductSearchParams): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get('/products/', { params });
    const data = response.data;
    return {
      ...data,
      results: (data.items ?? data.results ?? []).map(normalizeProduct),
    };
  },

  getProductDetail: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return normalizeProduct(response.data);
  },

  getProductReviews: async (id: string, page = 1): Promise<PaginatedResponse<Review>> => {
    const response = await apiClient.get(`/products/${id}/reviews`, { params: { page } });
    return response.data;
  },

  getSimilarProducts: async (id: string): Promise<Product[]> => {
    const response = await apiClient.get(`/products/${id}/similar`);
    return response.data;
  },

  getTrendingProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products/trending');
    return response.data;
  },

  getTodayPicks: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products/today-picks');
    return response.data;
  },

  // Categories live at /categories (separate router), not /products/categories
  getCategories: async (): Promise<Array<{ id: string; slug: string; name_en: string; name_mr: string; icon_url: string }>> => {
    const response = await apiClient.get('/categories');
    return response.data.map((c: { id: string; slug: string; name_en: string; name_mr: string; icon_url?: string }) => ({
      id: c.id,
      slug: c.slug,
      name_en: c.name_en,
      name_mr: c.name_mr,
      icon_url: c.icon_url ?? '',
    }));
  },

  getRecentlyViewed: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products/recently-viewed');
    return response.data;
  },

  trackProductView: async (productId: string): Promise<void> => {
    await apiClient.post(`/products/${productId}/view`).catch(() => {
      // Silent fail
    });
  },
};
