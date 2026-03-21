import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  loading(title: string, text: string): void {
    void Swal.fire({
      iconHtml: `
        <div class="alert-loader">
          <div class="washer-loader">
            <div class="washer">
              <div class="door">
                <div class="clothes"></div>
              </div>
            </div>
          </div>
        </div>
      `,
      title,
      text,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timerProgressBar: true,
      customClass: { popup: 'alert-popup' }
    });
  }

  async message(title: string, text: string, icon: 'success' | 'error' | 'info', timer = 2500): Promise<boolean> {
    const res = await Swal.fire({
      title,
      text,
      icon,
      timer,
      showConfirmButton: true,
      confirmButtonText: 'Aceptar',
      allowOutsideClick: false,
      timerProgressBar: true,
      customClass: {
        popup: 'alert-popup',
        confirmButton: 'alert-confirm'
      }
    });

    return res.isConfirmed;
  }

  async confirm(title: string, text: string, icon: 'warning' | 'question' = 'question'): Promise<boolean> {
    const res = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      customClass: {
        popup: 'alert-popup',
        confirmButton: 'alert-confirm',
        cancelButton: 'alert-cancel'
      }
    });

    return res.isConfirmed;
  }
}

