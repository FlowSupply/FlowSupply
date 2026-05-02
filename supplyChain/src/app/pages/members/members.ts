import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Member {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './members.html',
  styleUrl: './members.css',
})
export class Members implements OnInit {
  members: Member[] = [];
  searchTerm = '';

  // Invite modal
  isInviteModalOpen = false;
  inviteEmail = '';
  inviteRole = 'Employee';
  inviteResult: { shortCode: string; inviteLink: string } | null = null;
  inviteLoading = false;
  inviteError = '';
  
  chainInviteCode = '';
  chainInviteLink = '';


  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadMembers(); this.loadChainInfo();}

  private getHeaders() {
    return new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });
  }

  loadMembers() {
    this.http.get<Member[]>('http://localhost:5090/api/members', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => { this.members = data; this.cdr.detectChanges(); },
        error: (err) => console.error('Error loading members:', err)
      });
  }

  loadChainInfo() {
  this.http.get<any>('http://localhost:5090/api/chains/invite-link', { headers: this.getHeaders() })
    .subscribe({
      next: (res) => {
        this.chainInviteCode = res.code;
        this.chainInviteLink = res.link;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading chain info:', err)
    });
}


  get filteredMembers() {
    if (!this.searchTerm) return this.members;
    const t = this.searchTerm.toLowerCase();
    return this.members.filter(m =>
      m.fullName.toLowerCase().includes(t) ||
      m.email.toLowerCase().includes(t)
    );
  }

  get totalCount()  { return this.members.length; }
  get activeCount() { return this.members.filter(m => m.status === 'active').length; }
  get adminCount()  { return this.members.filter(m => m.role === 'Admin' || m.role === 'SuperAdmin').length; }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  openInviteModal() {
    this.isInviteModalOpen = true;
    this.inviteEmail = '';
    this.inviteRole  = 'Employee';
    this.inviteResult = null;
    this.inviteError  = '';
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
    this.inviteResult = null;
  }

  sendInvite() {
    if (!this.inviteEmail) { this.inviteError = 'Email is required.'; return; }
    this.inviteLoading = true;
    this.inviteError   = '';

    this.http.post<any>('http://localhost:5090/api/members/invite',
      { email: this.inviteEmail, role: this.inviteRole },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.inviteResult  = { shortCode: res.shortCode, inviteLink: res.inviteLink };
        this.inviteLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.inviteError   = err.error || 'Failed to send invite.';
        this.inviteLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  changeRole(member: Member, role: string) {
    this.http.patch(
      `http://localhost:5090/api/members/${member.id}/role`,
      JSON.stringify(role),
      { headers: this.getHeaders().set('Content-Type', 'application/json') }
    ).subscribe({
      next: () => { member.role = role; this.cdr.detectChanges(); },
      error: (err) => console.error('Error changing role:', err)
    });
  }

  removeMember(member: Member) {
    if (!confirm(`Remove ${member.fullName} from the chain?`)) return;
    this.http.delete(`http://localhost:5090/api/members/${member.id}`, { headers: this.getHeaders() })
      .subscribe({
        next: () => { this.members = this.members.filter(m => m.id !== member.id); this.cdr.detectChanges(); },
        error: (err) => console.error('Error removing member:', err)
      });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  currentUserId(): number {
    return parseInt(localStorage.getItem('userId') || '0');
  }
}
