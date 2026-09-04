import { UserRole } from '../types';

/**
 * SPECIAL UI RULE FOR MAHAM, REMSHA & SHAWAL:
 * Even though their system "role" is technically "member," they must NEVER
 * be shown with a role/label badge like "Member", "Employee", or "Admin" anywhere in the UI.
 * Only their name and designation should be displayed for them — no role tag at all.
 */
export function isSpecialNoRoleMember(name?: string, designation?: string): boolean {
  if (!name && !designation) return false;
  const n = (name || '').toLowerCase().trim();
  const d = (designation || '').toLowerCase().trim();

  // Check for Maham / Maham Noor
  if (n.includes('maham') || d.includes('content creator head')) return true;
  // Check for Remsha
  if (n.includes('remsha') || d.includes('social media head')) return true;
  // Check for Shawal
  if (n.includes('shawal') || d.includes('technical head')) return true;

  return false;
}

/**
 * Returns role display label, or null if the role label must NOT be shown.
 * - Maham, Remsha, Shawal: returns null (NO role tag at all)
 * - super_admin: returns null (never expose super_admin as user-facing label/dropdown)
 * - admin: returns "Admin"
 * - member: returns "Member"
 * - intern: returns "Intern"
 */
export function getRoleBadgeLabel(name: string, role: UserRole, designation?: string): string | null {
  if (isSpecialNoRoleMember(name, designation)) {
    return null;
  }
  if (role === 'admin' || role === 'super_admin') {
    return 'Admin';
  }
  if (role === 'member') {
    return 'Member';
  }
  if (role === 'intern') {
    return 'Intern';
  }
  return null;
}

/**
 * Get color scheme for role badges
 */
export function getRoleBadgeStyle(role: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'admin':
    case 'super_admin' as any:
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-transparent'
      };
    case 'member':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-transparent'
      };
    case 'intern':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-transparent'
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-transparent'
      };
  }
}


/**
 * Format date nicely (e.g. "Wednesday, Sep 2, 2026")
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get initials for avatar
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
