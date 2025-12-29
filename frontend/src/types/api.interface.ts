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

export interface HealthCheck {
    status: string;
    database: string;
    timestamp: string;
    uptime: number;
  }
  
