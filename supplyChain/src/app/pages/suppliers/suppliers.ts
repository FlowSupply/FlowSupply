import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-suppliers',
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers {
  suppliers = [
    {supplierName: 'Supplier 1', supplierCategory: 'Category 1', supplierRating: '4.5', supplierSupplies: '10', supplierAvrLatency: 0.3, supplierStatus: 'Active', supplierContactPerson: 'John Doe', supplierContactEmail: 'jD0eI@example.com', supplierContactPhone: '123-456-7890', supplierAddress: '123 Main St, City, Country'},
    {supplierName: 'Supplier 2', supplierCategory: 'Category 2', supplierRating: '4.5', supplierSupplies: '10', supplierAvrLatency: 1, supplierStatus: 'Active', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
  ]

  newSupplier: any = {
  supplierName: '',
  supplierCategory: '',
  supplierContactPerson: '',
  supplierContactEmail: '',
  supplierContactPhone: '',
  supplierAddress: ''
};

  selectedSupplier: any = null;

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

  addSupplier() {
    const supplierToAdd = {
    ...this.newSupplier
  };

  this.suppliers.push(supplierToAdd);

  this.selectedSupplier = supplierToAdd;

  this.newSupplier = {
    supplierName: '',
    supplierCategory: '',
    supplierContactPerson: '',
    supplierContactEmail: '',
    supplierContactPhone: '',
    supplierAddress: ''
  };
  }
}
