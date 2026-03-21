import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'theme';

  load(): void {
    const currentTheme = localStorage.getItem(this.key) ?? 'light';
    this.apply(currentTheme);
  }

  toggle(): string {
    const currentTheme = localStorage.getItem(this.key) ?? 'light';
    const next = currentTheme === 'light' ? 'dark' : 'light';
    this.apply(next);
    return next;
  }

  getCurrent(): 'light' | 'dark' {
    return (localStorage.getItem(this.key) ?? 'light') as 'light' | 'dark';
  }

  private apply(theme: string): void {
    document.documentElement.style.setProperty('--background', `var(--background-${theme})`);
    document.documentElement.style.setProperty('--background-content', `var(--background-content-${theme})`);
    document.documentElement.style.setProperty('--border', `var(--border-${theme})`);
    document.documentElement.style.setProperty('--hover-border', `var(--hover-border-${theme})`);
    document.documentElement.style.setProperty('--text', `var(--text-${theme})`);
    document.documentElement.style.setProperty('--placeholder', `var(--placeholder-${theme})`);
    document.documentElement.style.opacity = '1';
    localStorage.setItem(this.key, theme);
  }
}

