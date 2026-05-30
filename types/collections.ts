/**
 * Sima Arôme — TypeScript Type Definitions
 * Auto-generated from database migration
 * Generated: 2026-05-30
 */

// ────────────────────────────────────────────────────────────
// Core Domain Types
// ────────────────────────────────────────────────────────────

/**
 * Role entity — Access control roles for users
 */
export interface Role {
  id: string;
  name: string;
  description: string;
}

/**
 * User entity — Application users with role assignment
 */
export interface User {
  id: string;
  role_id: string;
  email: string;
  fullname: string;
  phone_number: string;
  gender: 1 | 2; // 1: Laki-laki, 2: Perempuan
  password_hash: string;
  created_at: string;
  updated_at?: string | null;
}

// ────────────────────────────────────────────────────────────
// Supplier Management
// ────────────────────────────────────────────────────────────

/**
 * Supplier entity — Vendor/supplier information
 */
export interface Supplier {
  id: string;
  name: string;
  favorite: boolean;
  phone_number: string;
  address: string;
  created_at: string;
}

/**
 * ProductSupplier entity — Product catalog from suppliers
 */
export interface ProductSupplier {
  id: string;
  name: string;
  price: number;
  unit: string;
  created_at: string;
}

/**
 * Offer entity — Supplier offer for a product
 */
export interface Offer {
  id: string;
  supplier_id: string;
  product_supplier_id: string;
  price: number;
  quality: number; // Scale 1-100
  lead_time: number; // In days
}

// ────────────────────────────────────────────────────────────
// Warehouse & Storage
// ────────────────────────────────────────────────────────────

/**
 * Warehouse entity — Physical storage location
 */
export interface Warehouse {
  id: string;
  log_id?: string | null;
  name: string;
  location: number;
  created_at: string;
}

/**
 * ColdStorageLog entity — Temperature monitoring for cold storage
 */
export interface ColdStorageLog {
  id: string;
  zone_id: string;
  temperature: number;
  alert_triggered?: boolean | null;
  recorded_at: string;
  warehouse_id?: string | null;
}

// ────────────────────────────────────────────────────────────
// Raw Materials & Quality Control
// ────────────────────────────────────────────────────────────

export type RawMaterialStatus =
  | 'PENDING_QC'
  | 'QC_ACCEPTED'
  | 'QC_REJECTED'
  | 'IN_PRODUCTION';

/**
 * RawMaterial entity — Incoming raw materials from suppliers
 */
export interface RawMaterial {
  id: string;
  warehouse_id: string;
  offer_id: string;
  batch_code: string;
  material_name: string;
  status: RawMaterialStatus;
  total_price: number;
  weight_kg: number;
  received_by: string;
  received_at: string;
  updated_at: string;
}

/**
 * QualityControl entity — QC inspection records
 */
export interface QualityControl {
  id: string;
  raw_material_id?: string | null;
  production_id?: string | null;
  checked_by: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
  qc_notes: string;
  created_at: string;
}

// ────────────────────────────────────────────────────────────
// Products & Inventory
// ────────────────────────────────────────────────────────────

/**
 * Product entity — Final product definition
 */
export interface Product {
  id: string;
  type: string;
  categories: string;
  price: number;
}

/**
 * ProductStock entity — Inventory tracking per warehouse
 */
export interface ProductStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  amount: number;
}

// ────────────────────────────────────────────────────────────
// Production & Recipes
// ────────────────────────────────────────────────────────────

export type ProductionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProductionPhaseStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Recipe entity — Formula linking products to raw materials
 */
export interface Recipe {
  id: string;
  products_id: string;
  raw_material_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

/**
 * Phase entity — Production process phases (Compounding, Filtering, etc.)
 */
export interface Phase {
  id: string;
  name: string;
  description: string;
}

/**
 * Production entity — Production batch/lot
 */
export interface Production {
  id: string;
  products_id: string;
  scheduled_date: string; // DATE format
  planned_quantity: number;
  actual_quantity: number;
  start_date: string; // DATE format
  end_date: string; // DATE format
  status: ProductionStatus;
  lot_number?: string | null;
  created_by?: string | null;
  created_at: string;
}

/**
 * ProductionPhase entity — Track production phase progress
 */
export interface ProductionPhase {
  id: string;
  production_id: string;
  phase_id: string;
  status: ProductionPhaseStatus;
  note: string;
}

/**
 * ProductionMaterial entity — Track material consumption per production
 */
export interface ProductionMaterial {
  id: string;
  raw_material_id: string;
  production_id: string;
  quantity_used: number;
}

// ────────────────────────────────────────────────────────────
// Audit & Logging
// ────────────────────────────────────────────────────────────

/**
 * AuditTrail entity — Change log for compliance & debugging
 */
export interface AuditTrail {
  id: string;
  user_id?: string | null;
  action: string;
  target_table: string;
  record_id: string;
  old_data?: string | null;
  new_data?: string | null;
  timestamp: string;
}

// ────────────────────────────────────────────────────────────
// API Response Wrappers
// ────────────────────────────────────────────────────────────

/**
 * DaaS API response wrapper
 */
export interface DaaSResponse<T> {
  data?: T[] | T;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  count: number;
  offset: number;
  limit: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends DaaSResponse<T> {
  meta?: PaginationMeta;
}

// ────────────────────────────────────────────────────────────
// Create/Update Request DTOs
// ────────────────────────────────────────────────────────────

export interface CreateUserRequest {
  role_id: string;
  email: string;
  fullname: string;
  phone_number: string;
  gender: 1 | 2;
  password_hash: string;
}

export interface UpdateUserRequest {
  role_id?: string;
  email?: string;
  fullname?: string;
  phone_number?: string;
  gender?: 1 | 2;
  password_hash?: string;
}

export interface CreateSupplierRequest {
  name: string;
  favorite?: boolean;
  phone_number: string;
  address: string;
}

export interface CreateRawMaterialRequest {
  warehouse_id: string;
  offer_id: string;
  batch_code: string;
  material_name: string;
  status: RawMaterialStatus;
  total_price: number;
  weight_kg: number;
  received_by: string;
}

export interface CreateProductRequest {
  type: string;
  categories: string;
  price: number;
}

export interface UpdateProductRequest {
  type?: string;
  categories?: string;
  price?: number;
}

export interface CreateRecipeRequest {
  products_id: string;
  raw_material_id: string;
  quantity: number;
}

export interface UpdateRecipeRequest {
  raw_material_id?: string;
  quantity?: number;
}

export interface CreatePhaseRequest {
  name: string;
  description: string;
}

export interface UpdatePhaseRequest {
  name?: string;
  description?: string;
}

export interface CreateProductionRequest {
  products_id: string;
  scheduled_date: string;
  planned_quantity: number;
  actual_quantity?: number;
  start_date: string;
  end_date: string;
  status?: ProductionStatus;
  lot_number?: string;
  created_by?: string;
}

export interface UpdateProductionRequest {
  products_id?: string;
  scheduled_date?: string;
  planned_quantity?: number;
  actual_quantity?: number;
  start_date?: string;
  end_date?: string;
  status?: ProductionStatus;
  lot_number?: string;
}

export interface CreateProductionPhaseRequest {
  production_id: string;
  phase_id: string;
  status?: ProductionPhaseStatus;
  note?: string;
}

export interface UpdateProductionPhaseRequest {
  status?: ProductionPhaseStatus;
  note?: string;
}

export interface CreateProductionMaterialRequest {
  raw_material_id: string;
  production_id: string;
  quantity_used: number;
}

export interface CreateQualityControlRequest {
  raw_material_id?: string;
  production_id?: string;
  checked_by: string;
  qc_status: 'PASSED' | 'FAILED' | 'PENDING';
  qc_notes: string;
}

// ────────────────────────────────────────────────────────────
// Filter/Query Types
// ────────────────────────────────────────────────────────────

export interface FilterOperator {
  _eq?: any;
  _neq?: any;
  _lt?: any;
  _lte?: any;
  _gt?: any;
  _gte?: any;
  _in?: any[];
  _nin?: any[];
  _contains?: string;
  _icontains?: string;
  _starts_with?: string;
  _ends_with?: string;
  _null?: boolean;
  _nnull?: boolean;
}

export interface QueryFilter {
  [key: string]: FilterOperator | any;
  _and?: QueryFilter[];
  _or?: QueryFilter[];
}

export interface QueryOptions {
  fields?: string | string[];
  filter?: QueryFilter;
  sort?: string | string[];
  limit?: number;
  offset?: number;
  aggregate?: Record<string, string[]>;
  groupBy?: string | string[];
}

// ────────────────────────────────────────────────────────────
// Aggregate Response Types
// ────────────────────────────────────────────────────────────

export interface AggregateResult {
  count?: { [key: string]: number };
  countDistinct?: { [key: string]: number };
  countAll?: { [key: string]: number };
  sum?: { [key: string]: number };
  sumDistinct?: { [key: string]: number };
  avg?: { [key: string]: number };
  avgDistinct?: { [key: string]: number };
  min?: { [key: string]: number };
  max?: { [key: string]: number };
}

export interface GroupedAggregateResult extends AggregateResult {
  [key: string]: any;
}
