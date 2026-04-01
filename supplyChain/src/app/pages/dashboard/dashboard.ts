import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  chartValues = [80, 70, 20, 50, 10, 90];

  months: string[] = [];

  maxValue = 0;
scaleSteps: number[] = [];

  ngOnInit() {
    this.months = this.getLastSixMonths();
    this.maxValue = Math.max(...this.chartValues);

     const roundedMax = Math.ceil(this.maxValue / 50) * 50;
     const step = roundedMax / 5;
     this.scaleSteps = Array.from({ length: 6 }, (_, i) => Math.round(i * step));
  }

  getLastSixMonths(): string[] {
    const result: string[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

      result.push(
        d.toLocaleString('default', { month: 'long' }) // "January"
      );
    }

    return result;
  }
}