export interface IPLocation {
  ip: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  lat?: number;
  lon?: number;
  isp: string;
  resolved: boolean;
  looked_up_at: string;
}

export interface Visit {
  id: string;
  ip: string;
  app: string;
  path: string;
  referrer: string;
  user_agent: string;
  /** Email of the signed-in account at the time, empty for an anonymous visit. */
  user_email: string;
  created_at: string;
  /** Absent until the address has been geolocated, or when the lookup failed. */
  location?: IPLocation;
}

export interface CountBucket {
  key: string;
  count: number;
}

export interface VisitStats {
  total: number;
  today: number;
  last_7_days: number;
  unique_ips_7d: number;
  by_country_30d: CountBucket[];
  by_app_30d: CountBucket[];
}
