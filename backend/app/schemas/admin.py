import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, ConfigDict


class FarmerApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None


class FarmerListFilter(BaseModel):
    status: Optional[str] = None
    district: Optional[str] = None
    page: int = 1
    page_size: int = 20


class AdminOrderFilter(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    farmer_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    page_size: int = 20


class AnalyticsOut(BaseModel):
    period: str
    total_revenue: Decimal
    total_orders: int
    total_customers: int
    total_farmers: int
    revenue_by_category: List[Dict[str, Any]]
    revenue_by_farmer: List[Dict[str, Any]]
    revenue_by_district: List[Dict[str, Any]]
    orders_by_status: Dict[str, int]
    top_products: List[Dict[str, Any]]


class PriceEditLog(BaseModel):
    product_id: uuid.UUID
    old_price: Decimal
    new_price: Decimal
    reason: str
    edited_by: uuid.UUID
    edited_at: datetime


class AdminProductUpdate(BaseModel):
    name_en: Optional[str] = None
    name_mr: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    status: Optional[str] = None
    reason: str


class DashboardStats(BaseModel):
    total_users: int
    total_farmers: int
    pending_farmers: int
    total_products: int
    low_stock_products: int
    total_orders: int
    revenue_today: Decimal
    revenue_this_month: Decimal
    top_products: List[Dict[str, Any]]
    recent_orders: List[Dict[str, Any]]


class AdminOrderStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None
