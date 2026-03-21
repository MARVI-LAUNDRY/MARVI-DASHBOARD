import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertsService } from '../../../core/services/alerts.service';
import { SessionService } from '../../../core/services/session.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../auth.service';

type Mode = 'login' | 'recovery' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly validHashes: Record<string, Mode> = {
    '#login': 'login',
    '#recovery': 'recovery',
    '#reset': 'reset'
  };

  mode: Mode = 'login';
  passwordInputType: 'password' | 'text' = 'password';

  username = '';
  password = '';
  recoveryEmail = '';
  resetCode = '';
  resetPassword = '';
  savedEmail = '';

  loginSubmitting = false;
  recoverySubmitting = false;
  resetSubmitting = false;

  navAnimationClass = '';
  footerAnimationClass = '';
  navJustify = 'flex-start';
  private animationRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollAnimationFrameId: number | null = null;
  private readonly scrollDurationMs = 700;

  constructor(
    private readonly authService: AuthService,
    private readonly alerts: AlertsService,
    private readonly session: SessionService,
    private readonly theme: ThemeService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.syncStateFromHash();
    this.loadTheme();
  }

  ngOnDestroy(): void {
    this.clearAnimationRecoveryTimer();
    this.cancelScrollAnimation();
  }

  @HostListener('window:hashchange')
  onHashChange(): void {
    this.syncStateFromHash();
  }

  @HostListener('window:pageshow')
  onPageShow(): void {
    this.syncStateFromHash();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.scrollPage();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event): void {
    event.preventDefault();

    if (this.mode === 'login') {
      void this.submitLogin();
      return;
    }

    if (this.mode === 'recovery') {
      void this.submitRecovery();
      return;
    }

    void this.submitReset();
  }

  togglePasswordVisibility(): void {
    this.passwordInputType = this.passwordInputType === 'password' ? 'text' : 'password';
  }

  async submitLogin(): Promise<void> {
    if (this.loginSubmitting) {
      return;
    }

    this.loginSubmitting = true;

    if (this.username.trim() === '') {
      await this.alerts.message('Faltan campos', 'Por favor completa todos los campos', 'info', 1500);
      this.updateHash('login');
      this.loginSubmitting = false;
      return;
    }

    try {
      this.alerts.loading('Iniciando sesion', 'Por favor, espera mientras se verifica tu informacion.');
      const response = await this.authService.login(this.username, this.password);

      if (response.success) {
        this.session.setToken(response.token);

        await this.alerts.message('!Bienvenido!', response.message, 'success', 1500);
        await this.router.navigateByUrl('/dashboard/home');
        return;
      }

      await this.alerts.message(response.message, response.error ?? 'Error inesperado', 'error', 3000);
      this.updateHash('login');
    } catch {
      await this.alerts.message('Error de conexion', 'No fue posible iniciar sesion. Intenta nuevamente.', 'error', 3000);
      this.updateHash('login');
    } finally {
      this.loginSubmitting = false;
    }
  }

  async submitRecovery(): Promise<void> {
    if (this.recoverySubmitting) {
      return;
    }

    this.recoverySubmitting = true;

    if (this.recoveryEmail.trim() === '') {
      await this.alerts.message('Faltan campos', 'Por favor completa todos los campos', 'info', 1500);
      this.updateHash('recovery');
      this.recoverySubmitting = false;
      return;
    }

    try {
      this.alerts.loading('Enviando correo', 'Por favor, espera mientras se procesa tu solicitud.');
      const response = await this.authService.forgotPassword(this.recoveryEmail);

      if (response.success) {
        this.savedEmail = this.recoveryEmail;
        await this.alerts.message('!Correo enviado!', response.message, 'success', 1500);
        this.updateHash('reset');
        return;
      }

      await this.alerts.message(response.message, response.error ?? 'Error inesperado', 'error', 3000);
      this.updateHash('recovery');
    } catch {
      await this.alerts.message('Error de conexion', 'No fue posible enviar el correo. Intenta nuevamente.', 'error', 3000);
      this.updateHash('recovery');
    } finally {
      this.recoverySubmitting = false;
    }
  }

  async submitReset(): Promise<void> {
    if (this.resetSubmitting) {
      return;
    }

    this.resetSubmitting = true;

    if (this.resetCode.trim() === '' || this.resetPassword.trim() === '') {
      await this.alerts.message('Faltan campos', 'Por favor completa todos los campos', 'info', 1500);
      this.updateHash('recovery');
      this.resetSubmitting = false;
      return;
    }

    try {
      this.alerts.loading('Restableciendo contrasena', 'Por favor, espera mientras se procesa tu solicitud.');
      const email = this.savedEmail || this.recoveryEmail;
      const response = await this.authService.resetPassword(email, this.resetCode, this.resetPassword);

      if (response.success) {
        await this.alerts.message('!Contrasena restablecida!', response.message, 'success', 1500);
        this.updateHash('recovery');
        return;
      }

      await this.alerts.message(response.message, response.error ?? 'Error inesperado', 'error', 3000);
      this.updateHash('recovery');
    } catch {
      await this.alerts.message(
        'Error de conexion',
        'No fue posible restablecer la contrasena. Intenta nuevamente.',
        'error',
        3000
      );
      this.updateHash('recovery');
    } finally {
      this.resetSubmitting = false;
    }
  }

  goToRecovery(): void {
    this.updateHash('recovery');
  }

  goToLogin(): void {
    this.updateHash('login');
  }

  onNavAnimationEnd(animationName: string): void {
    this.navJustify = this.mode === 'login' ? 'flex-start' : 'flex-end';

    if (animationName === 'hide' && this.navAnimationClass === 'hide') {
      this.navAnimationClass = 'show';
      this.footerAnimationClass = 'show';
      this.username = '';
      this.password = '';
      this.recoveryEmail = '';
      return;
    }

    if (animationName === 'show' && this.navAnimationClass === 'show') {
      this.resetHeaderFooterAnimationState();
    }
  }

  isRecoveryVisible(): boolean {
    return this.mode !== 'reset';
  }

  isResetVisible(): boolean {
    return this.mode === 'reset';
  }

  private syncStateFromHash(): void {
    const hash = this.validHashes[window.location.hash] ? window.location.hash : '#login';

    if (window.location.hash !== hash) {
      window.location.hash = hash;
      return;
    }

    this.setMode(this.validHashes[hash]);
    this.scrollPage();
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.clearInputs();
  }

  private clearInputs(): void {
    this.username = '';
    this.password = '';
    this.recoveryEmail = '';
    this.resetCode = '';
    this.resetPassword = '';
  }

  private updateHash(mode: Mode): void {
    const nextHash = `#${mode}`;
    if (window.location.hash === nextHash) {
      this.syncStateFromHash();
      return;
    }

    window.location.hash = nextHash;
  }

  private scrollPage(): void {
    this.startHeaderFooterAnimationCycle();
    const targetLeft = this.mode === 'login' ? 0 : window.innerWidth * 2;
    this.animateHorizontalScroll(targetLeft);
  }

  private animateHorizontalScroll(targetLeft: number): void {
    this.cancelScrollAnimation();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ left: targetLeft, top: 0, behavior: 'auto' });
      return;
    }

    const startLeft = window.scrollX;
    const distance = targetLeft - startLeft;

    if (Math.abs(distance) < 1) {
      return;
    }

    const startTime = performance.now();
    const animationStep = (currentTime: number): void => {
      const progress = Math.min((currentTime - startTime) / this.scrollDurationMs, 1);
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo({
        left: startLeft + distance * easedProgress,
        top: 0,
        behavior: 'auto'
      });

      if (progress < 1) {
        this.scrollAnimationFrameId = requestAnimationFrame(animationStep);
        return;
      }

      this.scrollAnimationFrameId = null;
    };

    this.scrollAnimationFrameId = requestAnimationFrame(animationStep);
  }

  private startHeaderFooterAnimationCycle(): void {
    this.resetHeaderFooterAnimationState();

    // Forzamos un tick para reiniciar la animacion aunque cambie el hash rapidamente.
    setTimeout(() => {
      this.navAnimationClass = 'hide';
      this.footerAnimationClass = 'hide';
    });

    this.clearAnimationRecoveryTimer();
    this.animationRecoveryTimer = setTimeout(() => {
      this.resetHeaderFooterAnimationState();
    }, 400);
  }

  private resetHeaderFooterAnimationState(): void {
    this.navAnimationClass = '';
    this.footerAnimationClass = '';
    this.navJustify = this.mode === 'login' ? 'flex-start' : 'flex-end';
  }

  private clearAnimationRecoveryTimer(): void {
    if (!this.animationRecoveryTimer) {
      return;
    }

    clearTimeout(this.animationRecoveryTimer);
    this.animationRecoveryTimer = null;
  }

  private cancelScrollAnimation(): void {
    if (this.scrollAnimationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.scrollAnimationFrameId);
    this.scrollAnimationFrameId = null;
  }

  private loadTheme(): void {
    this.theme.load();
  }
}



