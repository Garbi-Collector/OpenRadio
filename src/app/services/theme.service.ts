import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private themeSubject: BehaviorSubject<Theme>;
  public theme$: Observable<Theme>;

  constructor() {
    // Obtener el tema guardado o usar el tema del sistema
    const savedTheme = this.getSavedTheme();
    const initialTheme = savedTheme || this.getSystemTheme();

    this.themeSubject = new BehaviorSubject<Theme>(initialTheme);
    this.theme$ = this.themeSubject.asObservable();

    // Aplicar el tema inicial
    this.applyTheme(initialTheme);

    // Escuchar cambios en las preferencias del sistema
    this.listenToSystemThemeChanges();
  }

  /**
   * Obtiene el tema actual
   */
  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Cambia el tema de la aplicación
   */
  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    this.saveTheme(theme);
    this.themeSubject.next(theme);
  }

  /**
   * Alterna entre light y dark mode
   */
  toggleTheme(): void {
    const newTheme: Theme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Verifica si el tema actual es dark
   */
  isDarkMode(): boolean {
    return this.getCurrentTheme() === 'dark';
  }

  /**
   * Verifica si el tema actual es light
   */
  isLightMode(): boolean {
    return this.getCurrentTheme() === 'light';
  }

  /**
   * Resetea el tema a las preferencias del sistema
   */
  resetToSystemTheme(): void {
    const systemTheme = this.getSystemTheme();
    this.setTheme(systemTheme);
  }

  /**
   * Aplica el tema al documento
   */
  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Guarda el tema en localStorage
   */
  private saveTheme(theme: Theme): void {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (error) {
      console.error('Error al guardar el tema:', error);
    }
  }

  /**
   * Obtiene el tema guardado en localStorage
   */
  private getSavedTheme(): Theme | null {
    try {
      const saved = localStorage.getItem(this.THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch (error) {
      console.error('Error al obtener el tema guardado:', error);
      return null;
    }
  }

  /**
   * Obtiene el tema preferido del sistema
   */
  private getSystemTheme(): Theme {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Fallback por defecto
  }

  /**
   * Escucha cambios en las preferencias del sistema
   * (solo si el usuario no ha establecido una preferencia manual)
   */
  private listenToSystemThemeChanges(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', (e) => {
        // Solo aplicar cambios del sistema si no hay tema guardado
        if (!this.getSavedTheme()) {
          const newTheme: Theme = e.matches ? 'dark' : 'light';
          this.applyTheme(newTheme);
          this.themeSubject.next(newTheme);
        }
      });
    }
  }

  /**
   * Limpia el tema guardado (útil para testing o reset)
   */
  clearSavedTheme(): void {
    try {
      localStorage.removeItem(this.THEME_KEY);
    } catch (error) {
      console.error('Error al limpiar el tema guardado:', error);
    }
  }
}
