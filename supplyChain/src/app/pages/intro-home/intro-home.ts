import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-intro-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './intro-home.html',
  styleUrls: ['./intro-home.css'],
})
export class IntroHome implements OnInit {
  private http = inject(HttpClient);

  isCreateModalOpen = false;
  isJoinModalOpen = false;
  joinTab: 'code' | 'link' = 'code';
  createForm = { name: '', industry: '', description: '', visibility: 'private' };
  joinForm = { code: '', link: '' };

  ngOnInit() {}

  openCreateModal() {
    this.isCreateModalOpen = true;
  }

  closeCreateModal() {
    this.isCreateModalOpen = false;
    this.createForm = { name: '', industry: '', description: '', visibility: 'private' };
  }

  openJoinModal() {
    this.isJoinModalOpen = true;
  }

  closeJoinModal() {
    this.isJoinModalOpen = false;
    this.joinForm = { code: '', link: '' };
  }

  closeModals() {
    this.isCreateModalOpen = false;
    this.isJoinModalOpen = false;
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  createChain() {
    if (!this.createForm.name.trim()) {
      alert('Chain name is required');
      return;
    }

    const payload = {
      name: this.createForm.name,
      industry: this.createForm.industry,
      description: this.createForm.description,
      visibility: this.createForm.visibility
    };

    this.http.post('http://localhost:5090/api/chains', payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          alert('Supply chain created successfully!');
          localStorage.setItem('supplyChain', JSON.stringify(response));
          window.location.href = '/dashboard';
        },
        error: (err) => {
          console.error('Error creating chain:', err);
          alert('Failed to create supply chain. Please try again.');
        }
      });
  }

  joinChain() {
    const code = this.joinTab === 'code' ? this.joinForm.code : this.joinForm.link;
    if (!code.trim()) {
      alert(`Chain ${this.joinTab === 'code' ? 'code' : 'link'} is required`);
      return;
    }

    const payload = this.joinTab === 'code' 
      ? { code }
      : { link: code };

    this.http.post('http://localhost:5090/api/chains/join', payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          alert('Successfully joined supply chain!');
          localStorage.setItem('supplyChain', JSON.stringify(response));
          window.location.href = '/dashboard';
        },
        error: (err) => {
          console.error('Error joining chain:', err);
          alert('Failed to join supply chain. Please try again.');
        }
      });
  }
}
