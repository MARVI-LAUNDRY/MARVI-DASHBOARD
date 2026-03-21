import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface LoginResponse extends ApiResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly api: ApiService) {}

  login(usuario: string, contrasena: string): Promise<LoginResponse> {
    return this.api.post<LoginResponse>('users/login', { usuario, contrasena });
  }

  forgotPassword(email: string): Promise<ApiResponse> {
    return this.api.post<ApiResponse>(`users/forgot-password/${email}`);
  }

  resetPassword(email: string, codigo: string, contrasena: string): Promise<ApiResponse> {
    return this.api.post<ApiResponse>(`users/reset-password/${email}`, { codigo, contrasena });
  }
}

