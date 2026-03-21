import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface SessionUser {
  _id: string;
  usuario: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  correo: string;
  rol: string;
  imagen_perfil?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiDataResponse<T> {
  success: boolean;
  message: string;
  error?: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenName = 'token';
  private user: SessionUser | null = null;

  constructor(private readonly api: ApiService) {}

  getToken(): string {
    const row = document.cookie
      .split('; ')
      .find((cookieRow) => cookieRow.startsWith(`${this.tokenName}=`));
    return row ? row.split('=')[1] : '';
  }

  setToken(token: string): void {
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + 3 * 60 * 60 * 1000);
    document.cookie = `${this.tokenName}=${token}; expires=${expirationDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
  }

  clearToken(): void {
    document.cookie = `${this.tokenName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    this.user = null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== '';
  }

  getUser(): SessionUser | null {
    return this.user;
  }

  async loadCurrentUser(): Promise<SessionUser | null> {
    const token = this.getToken();
    if (!token) {
      this.user = null;
      return null;
    }

    const payload = this.decodeJwtPayload<{ id?: string }>(token);
    if (!payload?.id) {
      this.user = null;
      return null;
    }

    const response = await this.api.get<ApiDataResponse<SessionUser>>(`users/${payload.id}`, token);
    this.user = response.success && response.data ? response.data : null;
    return this.user;
  }

  private decodeJwtPayload<T>(token: string): T | null {
    const chunks = token.split('.');
    if (chunks.length < 2) {
      return null;
    }

    try {
      const payload = chunks[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '='));
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }
}

