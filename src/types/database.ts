export interface Hardware {
  id: string
  user_id: string
  serial_numbers: string[]
  device_type: string
  brand: string | null
  purchase_date: string | null
  school_year: string | null
  location: string | null
  price: number | null
  notes: string | null
  created_at: string
  updated_at: string
  status: string
  organization_id: string | null
  team_id: string | null
  device_status: string
  suspended_at: string | null
  asset_id: string
}

export interface HardwareType {
  id: string
  user_id: string
  type: string
  depreciation_period: number
  created_at: string
  updated_at: string
  organization_id: string | null
  team_id: string | null
  asset_id: string | null
  warranty_period: number | null
}

export interface HardwareAction {
  id: string
  hardware_id: string
  user_id: string
  title: string
  description: string | null
  incident_number: string | null
  action_type: string
  created_at: string
  updated_at: string
  follow_ups: unknown | null
  involved: string | null
  status: string
  organization_id: string | null
  team_id: string | null
}

export interface HardwareLoan {
  id: string
  hardware_id: string
  user_id: string
  organization_id: string | null
  team_id: string | null
  borrower_name: string
  borrower_email: string | null
  borrowed_at: string
  returned_at: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DepreciationRate {
  from_months: number
  to_months: number | null  // null = onwards (e.g. 36+ months)
  percentage: number         // recovery percentage 0-100
}

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  school_name: string | null
  contact_person: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  account_number: string | null
  btw_number: string | null
  btw_exempt: boolean | null
  payment_terms: number | null
  accent_color: string | null
  logo_url: string | null
  depreciation_rates: DepreciationRate[] | null
  created_at: string
  updated_at: string
  vip_status: boolean
  vip_code_used: string | null
  subscription_type: string
  kvk_number: string | null
  invoice_number_prefix: string | null
}

export interface Organization {
  id: string
  name: string
  owner_id: string
  subscription_type: string
  created_at: string
  updated_at: string
  school_name: string | null
  contact_person: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  account_number: string | null
  btw_number: string | null
  kvk_number: string | null
  btw_exempt: boolean | null
  payment_terms: number | null
  accent_color: string | null
  logo_url: string | null
  invoice_number_prefix: string | null
  invoice_number_format: string | null
}

export interface Team {
  id: string
  name: string
  owner_id: string
  organization_id: string
  created_at: string | null
  updated_at: string | null
  school_name: string | null
  contact_person: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  account_number: string | null
  btw_number: string | null
  kvk_number: string | null
  btw_exempt: boolean | null
  payment_terms: number | null
  accent_color: string | null
  logo_url: string | null
  depreciation_rates: DepreciationRate[] | null
  invoice_number_prefix: string | null
  invoice_number_format: string | null
}

export interface TeamMember {
  id: string
  organization_id: string
  user_id: string | null
  email: string
  status: string
  invited_by: string | null
  invited_at: string | null
  joined_at: string | null
  created_at: string
  updated_at: string
  role: string
  team_id: string | null
}
