import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-suppliers',
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers implements OnInit {
  // Вече е празен масив, ще се пълни от PostgreSQL
  suppliers: any[] =[];

  searchTerm = '';
  showFilterModal = false;
  filters = {
    category: '',
    rating: '',
    status: ''
  };
  activeFilters = {
    category: '',
    rating: '',
    status: ''
  };

  newSupplier: any = {
    supplierName: '',
    supplierCategory: '',
    supplierContactPerson: '',
    supplierContactEmail: '',
    supplierContactPhone: '',
    supplierAddress: ''
  };

  selectedSupplier: any = null;

  // Инжектираме HttpClient за заявките
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // Тази функция се извиква автоматично, когато страницата се зареди
  ngOnInit() {
    this.loadSuppliers();
  }

  get filteredSuppliers() {
    let filtered = this.suppliers;

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.supplierName.toLowerCase().includes(term) ||
        s.supplierCategory.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (this.activeFilters.category) {
      filtered = filtered.filter(s => s.supplierCategory === this.activeFilters.category);
    }

    // Rating filter
    if (this.activeFilters.rating) {
      filtered = filtered.filter(s => s.supplierRating.toString() === this.activeFilters.rating);
    }

    // Status filter
    if (this.activeFilters.status) {
      filtered = filtered.filter(s => s.supplierStatus === this.activeFilters.status);
    }

    return filtered;
  }

  get uniqueCategories() {
    return [...new Set(this.suppliers.map(s => s.supplierCategory))];
  }

  get uniqueStatuses() {
    return [...new Set(this.suppliers.map(s => s.supplierStatus))];
  }

  openFilterModal() {
    this.showFilterModal = true;
    this.cdr.detectChanges();
  }

  closeFilterModal() {
    this.showFilterModal = false;
    this.cdr.detectChanges();
  }

  applyFilters() {
    this.activeFilters = {
      category: this.filters.category,
      rating: this.filters.rating,
      status: this.filters.status
    };
    this.closeFilterModal();
  }

  clearFilters() {
    this.filters = {
      category: '',
      rating: '',
      status: ''
    };
    this.activeFilters = {
      category: '',
      rating: '',
      status: ''
    };
    this.cdr.detectChanges();
  }

  // Помощна функция за вземане на токена
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }


loadSuppliers() {
  this.http.get<any[]>('http://localhost:5090/api/suppliers', { headers: this.getHeaders() })
    .subscribe({
      next: (data) => {
        this.suppliers = data;
        this.cdr.detectChanges(); // force update
      },
      error: (err) => {
        console.error('Грешка при зареждане на доставчици:', err);
      }
    });
}

  // Добавя нов доставчик в базата данни
  addSupplier() {
    this.http.post('http://localhost:5090/api/suppliers', this.newSupplier, { headers: this.getHeaders() })
      .subscribe({
        next: (response: any) => {
          // Backend-ът връща новосъздадения доставчик (с неговото ново ID)
          this.suppliers.push(response);
          
          // Затваряме модала и изчистваме формата
          this.closeAddSupplierModal();
          this.newSupplier = {
            supplierName: '',
            supplierCategory: '',
            supplierContactPerson: '',
            supplierContactEmail: '',
            supplierContactPhone: '',
            supplierAddress: ''
          };

          this.cdr.detectChanges(); // force update
          
        },
        error: (err) => {
          console.error('Грешка при добавяне:', err);
          alert('Неуспешно добавяне на доставчик.');
        }
      });
  }

  openDetails(supplier: any) {
    this.selectedSupplier = supplier;
    document.querySelector('.details-overlay')?.classList.add('active');
  }

  closeDetails() {
    document.querySelector('.details-overlay')?.classList.remove('active');
  }

  openAddSupplierModal() {
    document.querySelector('.addSupplier-overlay')?.classList.add('active');
  }

  closeAddSupplierModal() {
    document.querySelector('.addSupplier-overlay')?.classList.remove('active');
  }

  // Статистиките се преизчисляват автоматично въз основа на данните от базата
  get activeCount(): number {
    return this.suppliers.filter(s => s.supplierStatus === 'Active').length;
  }

  get avgRating(): string {
    if (this.suppliers.length === 0) return '0.0';
    const avg = this.suppliers.reduce((sum, s) => sum + Number(s.supplierRating || 0), 0) / this.suppliers.length;
    return avg.toFixed(1);
  }

  get avgLatency(): string {
    if (this.suppliers.length === 0) return '0.0';
    const avg = this.suppliers.reduce((sum, s) => sum + Number(s.supplierAvrLatency || 0), 0) / this.suppliers.length;
    return avg.toFixed(1);
  }
}