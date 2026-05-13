import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { apiUrl } from '../../services/api.config';

export interface Member {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
  isOwner: boolean;
}
export interface RoleChange {
  id: number;
  changedBy: string;
  target: string;
  oldRole: string;
  newRole: string;
  changedAt: string;
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
  inviteResult: boolean = false;
  inviteLoading = false;
  inviteError = '';

  chainInviteCode = '';
  chainInviteLink = '';


  roleHistory: RoleChange[] = [];
  currentUserRole = 'Employee';
  ownerId: number = 0;
  currentUserIdValue: number = parseInt(localStorage.getItem('userId') || '0');


  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadMembers(); this.loadChainInfo();this.loadRoleHistory();}

  private getHeaders() {
    return new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });
  }

  loadMembers() {
  this.http.get<any>(apiUrl('members'), { headers: this.getHeaders() })
    .subscribe({
      next: (res) => {
        this.members = Array.isArray(res) ? res : res.members;
        this.currentUserRole = res.myRole || 'Employee';
        this.ownerId = res.ownerId;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading members:', err)
    });
}

  loadChainInfo() {
  this.http.get<any>(apiUrl('chains/invite-link'), { headers: this.getHeaders() })
    .subscribe({
      next: (res) => {
        this.chainInviteCode = res.code;
        this.chainInviteLink = res.link;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading chain info:', err)
    });
}
  loadRoleHistory() {
    this.http.get<RoleChange[]>(apiUrl('members/role-history'), { headers: this.getHeaders() })
      .subscribe({
        next: (data) => { this.roleHistory = data; this.cdr.detectChanges(); },
        error: (err) => console.error('Error loading history:', err)
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
    this.inviteResult = false;
    this.inviteError  = '';
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
    this.inviteResult = false;
  }

  sendInvite() {
  if (!this.inviteEmail) { this.inviteError = 'Email is required.'; return; }
  this.inviteLoading = true;
  this.inviteError   = '';

    this.http.post<any>(apiUrl('members/invite'),
      { email: this.inviteEmail, role: this.inviteRole },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.inviteResult  = true;
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
  // Не позволявай на Admin да промени SuperAdmin
  if (this.currentUserRole === 'Admin' && member.role === 'SuperAdmin') return;
  // Не позволявай на Admin да присвоява SuperAdmin
  if (this.currentUserRole === 'Admin' && role === 'SuperAdmin') return;

  this.http.patch(
    apiUrl(`members/${member.id}/role`),
    JSON.stringify(role),
    { headers: this.getHeaders().set('Content-Type', 'application/json') }
  ).subscribe({
    next: () => {
      member.role = role;
      this.loadRoleHistory(); // презареди историята
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Error changing role:', err)
  });
}

 getRoleOptions(member: Member): string[] {
  if (member.isOwner) return ['SuperAdmin']; // owner вижда само SuperAdmin
  if (this.currentUserRole === 'SuperAdmin') return ['Employee', 'Admin'];
  if (this.currentUserRole === 'Admin' && member.role !== 'SuperAdmin') return ['Employee', 'Admin'];
  return [member.role]; // fallback — покажи текущата роля
}

canChangeRole(member: Member): boolean {
  if (member.isOwner) return false;       // никой не може да пипа owner-а
  if (this.currentUserRole === 'SuperAdmin') return true;
  if (this.currentUserRole === 'Admin' && member.role !== 'SuperAdmin') return true;
  return false;
}

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('bg-BG') + ' ' + d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
  }


  removeMember(member: Member) {
    if (!confirm(`Remove ${member.fullName} from the chain?`)) return;
    this.http.delete(apiUrl(`members/${member.id}`), { headers: this.getHeaders() })
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
