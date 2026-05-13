import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Subscription, catchError, interval, startWith, switchMap } from 'rxjs';
import { apiUrl } from '../../services/api.config';

export interface Member {
  id: string;
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
export class Members implements OnInit, OnDestroy {
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
  private readonly membersRefreshMs = 5000;
  private membersSubscription?: Subscription;
  private localPendingInvites: Member[] = [];


  roleHistory: RoleChange[] = [];
  currentUserRole = 'Employee';
  ownerId: number = 0;
  currentUserIdValue: number = parseInt(localStorage.getItem('userId') || '0');


  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.startLiveMembers();
    this.loadChainInfo();
    this.loadRoleHistory();
  }

  ngOnDestroy() {
    this.membersSubscription?.unsubscribe();
  }

  private getHeaders() {
    return new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });
  }

  private startLiveMembers() {
    this.membersSubscription = interval(this.membersRefreshMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http.get<any>(apiUrl('members'), { headers: this.getHeaders() })
            .pipe(catchError((err) => {
              console.error('Error loading members:', err);
              return EMPTY;
            }))
        )
      )
      .subscribe({ next: (res) => this.applyMembersResponse(res) });
  }

  loadMembers() {
    this.http.get<any>(apiUrl('members'), { headers: this.getHeaders() })
      .subscribe({
        next: (res) => this.applyMembersResponse(res),
        error: (err) => console.error('Error loading members:', err)
      });
  }

  private applyMembersResponse(res: any) {
    const apiMembers = ((Array.isArray(res) ? res : res.members) ?? []) as Member[];
    this.members = this.mergePendingInvites(apiMembers);
    this.currentUserRole = res.myRole || 'Employee';
    this.ownerId = res.ownerId;
    this.cdr.detectChanges();
  }

  private mergePendingInvites(apiMembers: Member[]): Member[] {
    const activeEmails = new Set(
      apiMembers
        .filter(m => !this.isPendingStatus(m.status))
        .map(m => m.email.toLowerCase())
    );
    const apiPendingEmails = new Set(
      apiMembers
        .filter(m => this.isPendingStatus(m.status))
        .map(m => m.email.toLowerCase())
    );

    this.localPendingInvites = this.localPendingInvites.filter(pending => {
      const email = pending.email.toLowerCase();
      return !activeEmails.has(email) && !apiPendingEmails.has(email);
    });

    return [...this.localPendingInvites, ...apiMembers];
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
  get pendingCount() { return this.members.filter(m => this.isPendingStatus(m.status)).length; }
  get adminCount()  { return this.members.filter(m => m.role === 'Admin' || m.role === 'SuperAdmin').length; }

  isPendingStatus(status: string | null | undefined): boolean {
    const normalized = (status || '').toLowerCase();
    return normalized === 'pending' || normalized === 'awaiting';
  }

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
        this.addPendingInvite(res?.inviteId);
        this.loadMembers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.inviteError   = err.error || 'Failed to send invite.';
        this.inviteLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private addPendingInvite(inviteId?: string) {
    const email = this.inviteEmail.toLowerCase().trim();
    if (!email || this.members.some(m => m.email.toLowerCase() === email && this.isPendingStatus(m.status))) return;

    const pendingInvite = {
      id: inviteId || `pending-${email}`,
      fullName: 'Pending invite',
      email,
      role: this.inviteRole,
      status: 'pending',
      isOwner: false
    };

    this.localPendingInvites = [pendingInvite, ...this.localPendingInvites];
    this.members = this.mergePendingInvites(this.members);
  }

  changeRole(member: Member, role: string) {
  if (this.isPendingStatus(member.status)) return;
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
  if (this.isPendingStatus(member.status)) return false;
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
    if (this.isPendingStatus(member.status)) return;
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
