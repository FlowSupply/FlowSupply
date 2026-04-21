import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
type ProductStatus = 'Pending' | 'Rejected' | 'Approved';

@Component({
  selector: 'app-requests',
  imports: [CommonModule],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests {

  isModalOpen = false;

  products: {
    productId: string;
    productName: string;
    productQuantity: number;
    reason: string;
    date: string;
    productStatus: ProductStatus;
  }[] = [
    {
      productId: "dffdf",
      productName: 'djdkkd',
      productQuantity: 100,
      reason: 'dnfjdf',
      date: '20.03.2023',
      productStatus: 'Pending'
    },
    {
      productId: "lkfele",
      productName: 'hehehe',
      productQuantity: 50,
      reason: 'as;a',
      date: '20.03.2023',
      productStatus: 'Rejected'
    },
    {
      productId: "jhfjehi",
      productName: 'hahha',
      productQuantity: 120,
      reason: 'fndjfn',
      date: '20.03.2023',
      productStatus: 'Approved'
    }
  ];

  statusColors: Record<ProductStatus, string> = {
    Rejected: 'hsl(0 70% 50%)',
    Pending: 'hsl(43, 87%, 54%)',
    Approved: 'hsl(142 70% 45%)'
  };

  openCreateRequestModal() {
    this.isModalOpen = true;
  }

  closeCreateRequestModal() {
    this.isModalOpen = false;
  }

  submitRequest(productName: string, quantity: string, reason: string) {
    if (!productName || !quantity) return;

    this.products.push({
      productId: crypto.randomUUID(),
      productName,
      productQuantity: +quantity,
      reason,
      date: new Date().toLocaleDateString('bg-BG'),
      productStatus: 'Pending'
    });

    this.isModalOpen = false;
  }
}