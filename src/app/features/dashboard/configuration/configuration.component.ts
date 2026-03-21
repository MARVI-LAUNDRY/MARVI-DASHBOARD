import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertsService } from '../../../core/services/alerts.service';
import { ApiService } from '../../../core/services/api.service';
import { SessionService, SessionUser } from '../../../core/services/session.service';
import { ThemeService } from '../../../core/services/theme.service';

interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.scss'
})
export class ConfigurationComponent implements OnInit {
  profileImage = 'https://marvi-api.onrender.com/pictures/profile/0.jpg';
  readonly profileOptions = Array.from({ length: 12 }, (_, index) => `https://marvi-api.onrender.com/pictures/profile/${index + 1}.jpg`);
  darkMode = false;
  showProfilePicker = false;

  usuario = '';
  nombre = '';
  primerApellido = '';
  segundoApellido = '';
  correo = '';
  rol = '';

  editProfile = false;
  editPassword = false;

  oldPassword = '********';
  newPassword = '********';
  oldPasswordInputType: 'password' | 'text' = 'password';
  newPasswordInputType: 'password' | 'text' = 'password';

  private user: SessionUser | null = null;

  constructor(
    private readonly session: SessionService,
    private readonly theme: ThemeService,
    private readonly api: ApiService,
    private readonly alerts: AlertsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.session.getUser();
    this.darkMode = this.theme.getCurrent() === 'dark';

    if (!this.user) {
      return;
    }

    this.profileImage = this.user.imagen_perfil || this.profileImage;
    this.usuario = this.user.usuario;
    this.nombre = this.user.nombre;
    this.primerApellido = this.user.primer_apellido;
    this.segundoApellido = this.user.segundo_apellido;
    this.correo = this.user.correo;
    this.rol = this.user.rol;
  }

  toggleTheme(): void {
    this.theme.toggle();
    this.darkMode = this.theme.getCurrent() === 'dark';
  }

  get themeLabel(): string {
    return this.darkMode ? 'Modo oscuro' : 'Modo claro';
  }

  openProfilePicker(): void {
    this.showProfilePicker = true;
  }

  closeProfilePicker(): void {
    this.showProfilePicker = false;
  }

  async selectProfileImage(imageUrl: string): Promise<void> {
    if (!this.user) {
      return;
    }

    const token = this.session.getToken();
    const response = await this.api.patch<ApiResponse>(
      `users/${this.user._id}/profile-image`,
      { imagen_perfil: imageUrl },
      token
    );

    if (!response.success) {
      await this.alerts.message(response.message, response.error ?? 'No fue posible actualizar la foto.', 'error', 2200);
      return;
    }

    this.profileImage = imageUrl;
    this.showProfilePicker = false;
    this.user = await this.session.loadCurrentUser();
    await this.alerts.message('Foto actualizada', response.message, 'success', 1400);
  }

  enableProfileEdit(): void {
    this.editProfile = true;
  }

  cancelProfileEdit(): void {
    this.editProfile = false;
    if (!this.user) {
      return;
    }

    this.usuario = this.user.usuario;
    this.nombre = this.user.nombre;
    this.primerApellido = this.user.primer_apellido;
    this.segundoApellido = this.user.segundo_apellido;
    this.correo = this.user.correo;
  }

  async saveProfile(): Promise<void> {
    if (!this.user) {
      return;
    }

    const token = this.session.getToken();
    const response = await this.api.put<ApiResponse>(
      `users/${this.user._id}`,
      {
        usuario: this.usuario,
        nombre: this.nombre,
        primer_apellido: this.primerApellido,
        segundo_apellido: this.segundoApellido,
        correo: this.correo
      },
      token
    );

    if (!response.success) {
      await this.alerts.message(response.message, response.error ?? 'No fue posible actualizar.', 'error', 2200);
      return;
    }

    await this.alerts.message('Información actualizada', response.message, 'success', 1500);
    this.session.clearToken();
    await this.router.navigateByUrl('/login');
  }

  enablePasswordEdit(): void {
    this.editPassword = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.oldPasswordInputType = 'password';
    this.newPasswordInputType = 'password';
  }

  cancelPasswordEdit(): void {
    this.editPassword = false;
    this.oldPassword = '********';
    this.newPassword = '********';
    this.oldPasswordInputType = 'password';
    this.newPasswordInputType = 'password';
  }

  togglePasswordVisibility(field: 'old' | 'new'): void {
    if (!this.editPassword) {
      return;
    }

    if (field === 'old') {
      this.oldPasswordInputType = this.oldPasswordInputType === 'password' ? 'text' : 'password';
      return;
    }

    this.newPasswordInputType = this.newPasswordInputType === 'password' ? 'text' : 'password';
  }

  async savePassword(): Promise<void> {
    if (!this.user) {
      return;
    }

    const token = this.session.getToken();
    const response = await this.api.patch<ApiResponse>(
      `users/${this.user._id}/password`,
      { contrasena_actual: this.oldPassword, contrasena_nueva: this.newPassword },
      token
    );

    if (!response.success) {
      await this.alerts.message(response.message, response.error ?? 'No fue posible actualizar.', 'error', 2200);
      return;
    }

    await this.alerts.message('Información actualizada', response.message, 'success', 1500);
    this.cancelPasswordEdit();
    this.user = await this.session.loadCurrentUser();
  }
}

