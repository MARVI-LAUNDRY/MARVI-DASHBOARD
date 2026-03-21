import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private areaChart: Chart | null = null;
  private barChart: Chart | null = null;

  ngAfterViewInit(): void {
    const areaCanvas = document.getElementById('areaChart') as HTMLCanvasElement | null;
    const barCanvas = document.getElementById('barChart') as HTMLCanvasElement | null;

    if (!areaCanvas || !barCanvas) {
      return;
    }

    const gradient = areaCanvas
      .getContext('2d')
      ?.createLinearGradient(0, 0, 0, 400);

    if (!gradient) {
      return;
    }

    gradient.addColorStop(0, '#ffe1c09f');
    gradient.addColorStop(1, '#ffe1c09f');

    const areaConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'],
        datasets: [
          {
            label: 'Pedidos',
            data: [12, 19, 3, 5, 2, 3, 7],
            backgroundColor: gradient,
            borderColor: '#dd5746',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true } }
      }
    };

    const barConfig: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'],
        datasets: [
          {
            label: 'Ingresos',
            data: [1000, 589, 307, 1430, 2000, 1300, 2005],
            backgroundColor: gradient,
            borderColor: '#dd5746',
            borderWidth: 2,
            borderRadius: 15
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true } }
      }
    };

    this.areaChart = new Chart(areaCanvas, areaConfig);
    this.barChart = new Chart(barCanvas, barConfig);
  }

  ngOnDestroy(): void {
    this.areaChart?.destroy();
    this.barChart?.destroy();
  }
}

