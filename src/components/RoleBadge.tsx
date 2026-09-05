import React from 'react';
import { UserRole } from '../types';
import { getRoleBadgeLabel, getRoleBadgeStyle } from '../utils/rules';

interface RoleBadgeProps {
  name: string;
  role: UserRole;
  designation?: string;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  name,
  role,
  designation,
  className = '',
}) => {
  const label = getRoleBadgeLabel(name, role, designation);

  // If label is null (e.g. Maham, Remsha, Shawal), render nothing!
  if (!label) {
    return null;
  }

  const styles = getRoleBadgeStyle(role);

  return (
    <span
      id={`role-badge-${role}`}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${styles.bg} ${styles.text} whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );

};
