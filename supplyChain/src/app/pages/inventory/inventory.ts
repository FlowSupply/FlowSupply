import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory {
  products = [
    {productName: 'Supplier 1', productSCU: '4.5', productCategory: 'Category 1', productAvailability: 2, productMinimum: 20, productStatus: 'OK', supplierContactPerson: 'John Doe', supplierContactEmail: 'jD0eI@example.com', supplierContactPhone: '123-456-7890', supplierAddress: '123 Main St, City, Country'},
    {productName: 'Supplier 2', productSCU: '4.5', productCategory: 'Category 2', productAvailability: 60, productMinimum: 50, productStatus: 'Critical', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productName: 'Supplier 2', productSCU: '4.5', productCategory: 'Category 2', productAvailability: 45, productMinimum: 50, productStatus: 'Critical', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productName: 'Supplier 2', productSCU: '4.5', productCategory: 'Category 2', productAvailability: 40, productMinimum: 50, productStatus: 'Critical', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productName: 'Supplier 2', productSCU: '4.5', productCategory: 'Category 2', productAvailability: 25, productMinimum: 50, productStatus: 'Critical', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productName: 'Supplier 2', productSCU: '4.5', productCategory: 'Category 2', productAvailability: 15, productMinimum: 50, productStatus: 'Critical', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
  ]

  statusColors = {
    Critical: 'hsl(0, 72%, 51%)',      // red
    'Very Low': 'hsl(29, 85%, 55%)',   // orange-red
    Low: 'hsl(55, 73%, 50%)',         // orange
    Good: 'hsl(152, 85%, 43%)',        // light-green
    Optimal: 'hsl(152, 90%, 27%)',    // green
    Overstock: 'hsl(217 91% 60%)'   // blue
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

  addSupplier() {
    const supplierToAdd = {
    ...this.newSupplier
  };

  this.products.push(supplierToAdd);

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

  compareAvailabilityToMinimum(product: any) {
    let availabilityPercentage = (product.productAvailability / product.productMinimum) * 100;

    if (availabilityPercentage <= 15) {
      return product.productStatus = 'Critical';
    } else if (availabilityPercentage <= 30) {
      return product.productStatus = 'Very Low';
    } else if (availabilityPercentage <= 50) {
      return product.productStatus = 'Low';
    } else if (availabilityPercentage <= 80) {
      return product.productStatus = 'Good';
    } else if (availabilityPercentage <= 100) {
      return product.productStatus = 'Optimal';
    } else {
      return product.productStatus = 'Overstock';
    }
  }

  getLightColor(color: string) {
    return color.replace('hsl', 'hsla').replace(')', ' , 0.2)');
  }

    getAvailabilityPercentage(product: any) {
      if (!product.productMinimum) return 0;
      return (product.productAvailability / product.productMinimum) * 100;
    }
}
