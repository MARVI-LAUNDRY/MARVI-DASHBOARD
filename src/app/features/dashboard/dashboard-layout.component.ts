import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AlertsService } from '../../core/services/alerts.service';
import { SessionService, SessionUser } from '../../core/services/session.service';
import { ThemeService } from '../../core/services/theme.service';
import { MODULE_PLACEHOLDER_MAP } from './module-definitions';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit {
  readonly isAdminOnly = new Set(['users', 'clients', 'providers', 'purchases']);

  mini = localStorage.getItem('mini') === 'true';
  user: SessionUser | null = null;
  searchValue = '';
  searchPlaceholder = 'Buscar';
  searchVisible = false;

  constructor(
    private readonly session: SessionService,
    private readonly theme: ThemeService,
    private readonly alerts: AlertsService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.theme.load();
    this.user = await this.session.loadCurrentUser();

    if (!this.user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.syncSearchBar();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncSearchBar();
      }
    });
  }

  get profileImage(): string {
    return this.user?.imagen_perfil || 'https://marvi-api.onrender.com/pictures/profile/0.jpg';
  }

  toggleMenu(): void {
    this.mini = !this.mini;
    localStorage.setItem('mini', String(this.mini));
  }

  canShowMenuItem(key: string): boolean {
    if (!this.user) {
      return false;
    }

    if (this.user.rol === 'administrador') {
      return true;
    }

    return !this.isAdminOnly.has(key);
  }

  async logout(): Promise<void> {
    const confirmed = await this.alerts.confirm('Cerrar sesion', 'Estas seguro de que deseas cerrar sesion?', 'question');
    if (!confirmed) {
      return;
    }

    this.session.clearToken();
    await this.router.navigateByUrl('/login');
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== 'NumpadEnter') {
      return;
    }

    void this.router.navigate([], {
      queryParams: { q: this.searchValue.trim() || null },
      queryParamsHandling: 'merge'
    });
  }

  onSearchInput(): void {
    if (this.searchValue.trim() !== '') {
      return;
    }

    void this.router.navigate([], {
      queryParams: { q: null },
      queryParamsHandling: 'merge'
    });
  }

  private syncSearchBar(): void {
    const urlTree = this.router.parseUrl(this.router.url);
    const segments = urlTree.root.children['primary']?.segments ?? [];
    const moduleKey = segments.length > 1 ? segments[1].path : '';

    this.searchVisible = !!MODULE_PLACEHOLDER_MAP[moduleKey];
    this.searchPlaceholder = MODULE_PLACEHOLDER_MAP[moduleKey] ?? 'Buscar';
    this.searchValue = urlTree.queryParams['q'] ?? '';
  }
}

