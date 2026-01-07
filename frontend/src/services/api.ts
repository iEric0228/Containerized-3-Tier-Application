import axios from 'axios';
import { User, ApiResponse, HealthCheck } from '../types/api.interface';

// Environment-based API URL
const API_BASE_URL = '/api';

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
    try {
      // Try to get actual logs with proper time range
      const endTime = Date.now() * 1000000; // Current time in nanoseconds
      const startTime = endTime - (24 * 60 * 60 * 1000 * 1000000); // 24 hours ago
      
      // Try different label queries to find actual logs
      const queries = [
        '{job="backend"}',
        '{app="containerized-app"}',
        '{container_name="containerized-3-tier-application-backend-1"}',
        '{service_name="backend"}',
        '{}' // Get all logs as last resort
      ];
      
      console.log('Trying Loki queries for real logs:', queries);
      
      for (const query of queries) {
        try {
          const response = await api.get('/loki/query_range', {
            params: {
              query,
              limit,
              start: startTime.toString(),
              end: endTime.toString()
            }
          });
          
          console.log(`Loki response for query "${query}":`, response.data);
          
          // Check if we got actual log data
          if (response.data?.data?.result && response.data.data.result.length > 0) {
            const hasRealLogs = response.data.data.result.some((stream: any) => 
              stream.values && stream.values.length > 0
            );
            
            if (hasRealLogs) {
              console.log('✅ Found real logs with query:', query);
              return response.data;
            }
          }
        } catch (queryError: any) {
          console.warn(`Query "${query}" failed:`, queryError.response?.data || queryError.message);
          continue;
        }
      }
      
      console.log('⚠️ No real logs found, returning empty result');
      
      // Return empty result instead of mock data
      return {
        data: {
          result: [],
          resultType: 'streams'
        }
      };
    } catch (error: any) {
      console.error('Loki query error:', error);
      console.error('Error details:', error.response?.data);
      
      // Return empty result instead of throwing
      return {
        data: {
          result: [],
          resultType: 'streams'
        }
      };
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