export interface Dealer {
  brand: string;
  brandKey: string;
  color: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  lat: number;
  lng: number;
  type: string;
  code?: string;
  cust_group?: string;
  email?: string;
  verified?: string;
}

export interface BrandStats {
  brand: string;
  brandKey: string;
  color: string;
  count: number;
  states: number;
  cities: number;
}

export interface StateStats {
  state: string;
  total: number;
  continental: number;
  competitors: number;
  brands: Record<string, number>;
}

export const BRAND_CONFIG: Record<string, { color: string; label: string; priority: number }> = {
  continental: { color: '#FFD700', label: 'Continental', priority: 0 },
  bridgestone: { color: '#E74C3C', label: 'Bridgestone', priority: 1 },
  mrf: { color: '#E91E63', label: 'MRF', priority: 2 },
  apollo: { color: '#F39C12', label: 'Apollo Tyres', priority: 3 },
  goodyear: { color: '#00BCD4', label: 'Goodyear', priority: 4 },
  ceat: { color: '#27AE60', label: 'CEAT', priority: 5 },
  jktyre: { color: '#8E44AD', label: 'JK Tyre', priority: 6 },
  michelin: { color: '#FF9800', label: 'Michelin', priority: 7 },
  yokohama: { color: '#3498DB', label: 'Yokohama', priority: 8 },
};
