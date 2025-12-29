import axios from 'axios';
import { User, ApiResponse, HealthCheck } from '../types/api.interface';

// Environment-based API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiService {
  static async getHealth(): Promise<HealthCheck> {
    const response = await api.get<HealthCheck>('/health');
    return response.data;
  }

  static async getUsers(): Promise<ApiResponse<User[]>> {
    const response = await api.get<ApiResponse<User[]>>('/api/users');
    return response.data;
  }

  static async testConnection(): Promise<{ message: string; environment: string }> {
    const response = await api.get('/api');
    return response.data;
  }
}