// ── Пользователь ──────────────────────────────────────────
export interface User {
  id: number
  username: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  full_name?: string
  role?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

// ── Номенклатура ──────────────────────────────────────────
export interface Nomenclature {
  id: number
  name: string
  catalog_number: string | null
  manufacturer: string | null
  unit: string
  shelf_life_months: number | null
  storage_conditions: string | null
  okpd2_code: string | null
  ktru_code: string | null
  nkmi_code: string | null
  is_active: boolean
  created_at: string
}

export interface NomenclatureCreate {
  name: string
  catalog_number?: string
  manufacturer?: string
  unit?: string
  shelf_life_months?: number
  storage_conditions?: string
  okpd2_code?: string
  ktru_code?: string
  nkmi_code?: string
}

export interface NomenclatureUpdate extends Partial<NomenclatureCreate> {
  is_active?: boolean
}

// ── Поставщики ────────────────────────────────────────────
export interface Supplier {
  id: number
  name: string
  inn: string | null
  kpp: string | null
  address: string | null
  bank_details: string | null
  contact_email: string | null
  contact_phone: string | null
  manager_name: string | null
  rating: number | null
  is_active: boolean
  created_at: string
}

export interface SupplierCreate {
  name: string
  inn?: string
  kpp?: string
  address?: string
  bank_details?: string
  contact_email?: string
  contact_phone?: string
  manager_name?: string
  rating?: number
}

export interface SupplierUpdate extends Partial<SupplierCreate> {
  is_active?: boolean
}

// ── Коммерческие предложения ──────────────────────────────
export interface OfferItem {
  id: number
  offer_id: number
  nomenclature_id: number | null
  raw_name: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  delivery_days: number | null
  raw_text: string | null
  created_at: string
}

export interface CommercialOffer {
  id: number
  supplier_id: number
  offer_number: string | null
  offer_date: string | null
  total_amount: number | null
  file_path: string | null
  parsed_status: string
  items: OfferItem[]
  created_at: string
}

// ── Склад ─────────────────────────────────────────────────
export interface Inventory {
  id: number
  nomenclature_id: number
  batch_number: string | null
  quantity: number
  unit: string
  expiry_date: string | null
  received_date: string | null
  offer_id: number | null
  status: string
  created_at: string
}

export interface InventoryCreate {
  nomenclature_id: number
  batch_number?: string
  quantity?: number
  unit?: string
  expiry_date?: string
  received_date?: string
  offer_id?: number
}

export interface InventoryTransaction {
  id: number
  inventory_id: number
  transaction_type: string
  quantity: number
  reason: string | null
  created_at: string
}

export interface InventoryTransactionCreate {
  inventory_id: number
  transaction_type: string
  quantity: number
  reason?: string
}

// ── Закупки ───────────────────────────────────────────────
export interface PurchaseRequest {
  id: number
  request_number: string | null
  request_date: string | null
  nomenclature_id: number
  quantity: number | null
  unit: string | null
  estimated_price: number | null
  supplier_id: number | null
  status: string
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export interface PurchaseRequestCreate {
  request_number?: string
  request_date?: string
  nomenclature_id: number
  quantity?: number
  unit?: string
  estimated_price?: number
  supplier_id?: number
}

export interface PurchaseRequestUpdate {
  request_number?: string
  request_date?: string
  nomenclature_id?: number
  quantity?: number
  unit?: string
  estimated_price?: number
  supplier_id?: number
  status?: string
  approved_by?: string
}

// ── Оборудование ──────────────────────────────────────────
export interface Equipment {
  id: number
  name: string
  equipment_type: string | null
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  inventory_number: string | null
  department: string | null
  location: string | null
  status: string
  commission_date: string | null
  last_maintenance: string | null
  next_maintenance: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface EquipmentCreate {
  name: string
  equipment_type?: string
  manufacturer?: string
  model?: string
  serial_number?: string
  inventory_number?: string
  department?: string
  location?: string
  status?: string
  commission_date?: string
  last_maintenance?: string
  next_maintenance?: string
  notes?: string
}

export interface EquipmentUpdate extends Partial<EquipmentCreate> {}

// ── Госзакупки (zakupki.gov.ru) ───────────────────────────
export interface GovContract {
  id: number
  reg_number: string
  subject: string
  price: number
  currency: string
  customer: string | null
  supplier: string | null
  region: string | null
  publish_date: string | null
  contract_url: string | null
  parsed_at: string | null
  profit_margin: number | null
  drop_shipping_score: number | null
  is_profitable: boolean
  created_at: string
  updated_at: string
  price_comparisons: PriceComparison[]
}

export interface PriceComparison {
  id: number
  contract_id: number
  source: string
  product_name: string | null
  market_price: number
  gov_price: number
  profit_potential: number
  drop_shipping_score: number
  url: string | null
  created_at: string
}

export interface PriceMatch {
  source: string
  product_name: string | null
  market_price: number
  gov_price: number
  profit_potential: number
  drop_shipping_score: number
  url: string | null
}

export interface PriceAnalysisResponse {
  contract_subject: string
  gov_price: number
  best_margin: number
  recommendation: string
  matches: PriceMatch[]
}

export interface ZakupkiScanRequest {
  search_string?: string
  region?: string
  days?: number
  min_price?: number
  max_pages?: number
}

export interface ZakupkiScanResponse {
  total_found: number
  profitable_count: number
  contracts: GovContract[]
  message: string
}

// ── FedLab База знаний ─────────────────────────────────────
export interface FedLabContent {
  id: number
  title: string
  content: string | null
  summary: string | null
  url: string | null
  source: string
  content_type: string
  category: string | null
  tags: string | null
  event_type: string | null
  location: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  month: string | null
  year: number | null
  is_online: boolean
  is_annual: boolean
  doc_number: string | null
  status: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface FedLabSearchResponse {
  query: string
  results: FedLabContent[]
  total: number
}

// ── Мероприятия лабораторной медицины ──────────────────────
export interface LabEvent {
  id: number
  title: string
  description: string | null
  event_type: string | null
  location: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  month: string | null
  year: number | null
  url: string | null
  is_online: boolean
  is_annual: boolean
  source: string | null
  created_at: string
  updated_at: string
}

export interface EventSearchResponse {
  query: string
  results: LabEvent[]
  total: number
}

// ── API ответы ────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
}
