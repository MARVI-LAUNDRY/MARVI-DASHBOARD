import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = 'https://marvi-api.onrender.com/api/';

  constructor(private readonly http: HttpClient) {}

  get<T>(endpoint: string, token = ''): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.base}${endpoint}`, { headers: this.buildHeaders(token) }));
  }

  post<T>(endpoint: string, data: unknown = {}, token = ''): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.base}${endpoint}`, data, { headers: this.buildHeaders(token, data) }));
  }

  put<T>(endpoint: string, data: unknown = {}, token = ''): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.base}${endpoint}`, data, { headers: this.buildHeaders(token, data) }));
  }

  patch<T>(endpoint: string, data: unknown = {}, token = ''): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.base}${endpoint}`, data, { headers: this.buildHeaders(token, data) }));
  }

  delete<T>(endpoint: string, token = ''): Promise<T> {
    return firstValueFrom(this.http.delete<T>(`${this.base}${endpoint}`, { headers: this.buildHeaders(token) }));
  }

  private buildHeaders(token: string, data?: unknown): HttpHeaders {
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(data instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }
}

