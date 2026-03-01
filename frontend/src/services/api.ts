import axios from 'axios';
import { User, ApiResponse, HealthCheck } from '../types/api.interface';

// Environment-based API URL: set REACT_APP_API_URL for direct backend access (e.g., in production
// when the API is on a different origin), or leave unset to use the Nginx /api proxy (default).
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class ApiService {
  static async getHealth(): Promise<HealthCheck> {
    const response = await api.get<HealthCheck>('/health');
    return response.data;
  }

  static async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await api.get<ApiResponse<User[]>>('/users');
    return response.data;
  }

  static async testConnection(): Promise<{ message: string; environment: string }> {
    const response = await api.get('');
    return response.data;
  }

  static async getPrometheusMetrics(): Promise<any> {
    try {
      const queries = [
        'http_requests_total',
        'http_request_duration_seconds_sum',
        'http_request_duration_seconds_count'
      ];
      
      const results = await Promise.all(
        queries.map(query => 
          api.get('/prometheus/query', {
            params: { query }
          })
        )
      );
      
      console.log('Prometheus responses:', results.map(r => r.data));
      
      return {
        data: {
          result: results.flatMap(r => r.data.data?.result || [])
        }
      };
    } catch (error: any) {
      console.error('Prometheus query error:', error);
      console.error('Error details:', error.response?.data);
      throw error;
    }
  }

  static async getLokiLogs(limit: number = 100): Promise<any> {
    const endTime = Date.now() * 1000000;
    const startTime = endTime - (24 * 60 * 60 * 1000 * 1000000); // 24 hours

    try {
      const response = await api.get('/loki/query_range', {
        params: {
          query: '{job="backend"}',
          limit,
          start: startTime.toString(),
          end: endTime.toString()
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Loki query error:', error.response?.data || error.message);
      return { data: { result: [], resultType: 'streams' } };
    }
  }

  static async getMetricsData(): Promise<any> {
    try {
      const response = await api.get('/metrics/test');
      return response.data;
    } catch (error) {
      console.warn('Metrics endpoint not available, using mock data');
      return {
        timestamp: Date.now(),
        requests_total: 0,
        response_time_ms: 0,
        cpu_usage_percent: 0,
        memory_usage_percent: 0,
        error_rate_percent: 0
      };
    }
  }
}

export default api;