export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthCheck {
  status: string;
  database: string;
  timestamp: string;
  uptime: number;
  environment?: string;
}

// Prometheus types
export interface PrometheusMetric {
  metric: {
    __name__?: string;
    name?: string;
    [key: string]: string | undefined;
  };
  value?: [number, string];
  values?: [number, string][];
}

export interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusMetric[];
  };
}

export interface PrometheusAggregated {
  data: {
    result: PrometheusMetric[];
  };
}

// Loki types
export interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

export interface LokiQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: LokiStream[];
  };
}

// Metrics data (fallback shape)
export interface MetricsData {
  timestamp: number;
  requests_total: number;
  response_time_ms: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  error_rate_percent: number;
}
