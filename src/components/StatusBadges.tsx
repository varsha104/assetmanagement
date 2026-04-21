import { Badge } from '@/components/ui/badge';
import { AssetStatus, ApprovalStatus, IssueStatus, IssuePriority } from '@/types';

export function StatusBadge({ status }: { status: AssetStatus }) {
  const statusKey = (status || '').toUpperCase();
  const variants: Record<string, string> = {
    'AVAILABLE': 'bg-success/15 text-success border-success/30',
    'ASSIGNED': 'bg-primary/15 text-primary border-primary/30',
    'UNDER REPAIR': 'bg-warning/15 text-warning border-warning/30',
    'RETIRED': 'bg-destructive/15 text-destructive border-destructive/30',
    'DISPOSAL': 'bg-red-500 text-white border-red-600 max-w-fit font-semibold',
    'OBSOLETE': 'bg-red-500 text-white border-red-600 max-w-fit font-semibold',
  };
  const defaultVariant = 'bg-muted text-muted-foreground border-border';
  const customVariant = variants[statusKey] || defaultVariant;
  return <Badge variant="outline" className={customVariant}>{status}</Badge>;
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const variants: Record<ApprovalStatus, string> = {
    'Pending': 'bg-warning/15 text-warning border-warning/30',
    'Approved': 'bg-success/15 text-success border-success/30',
    'Rejected': 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return <Badge variant="outline" className={variants[status]}>{status}</Badge>;
}

export function RequestStatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase() || 'PENDING';
  let className = 'bg-muted text-muted-foreground';

  if (s === 'PENDING') className = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  else if (s === 'APPROVED') className = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  else if (s === 'REJECTED') className = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
  else if (s === 'ASSIGNED') className = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';

  return <Badge variant="outline" className={className}>{status || 'PENDING'}</Badge>;
}

export function IssueBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase() || 'OPEN';
  let className = 'bg-muted text-muted-foreground border-border';

  if (s === 'OPEN') className = 'bg-warning/15 text-warning border-warning/30';
  else if (s === 'IN REVIEW') className = 'bg-info/15 text-info border-info/30';
  else if (s === 'IN REPAIR') className = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  else if (s === 'IN PROGRESS') className = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  else if (s === 'REPLACEMENT') className = 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800';
  else if (s === 'ESCALATED') className = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
  else if (s === 'OTHER') className = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700';
  else if (s === 'RESOLVED') className = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';

  return <Badge variant="outline" className={className}>{status || 'Open'}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const variants: Record<IssuePriority, string> = {
    'Low': 'bg-muted text-muted-foreground border-border',
    'Medium': 'bg-info/15 text-info border-info/30',
    'High': 'bg-warning/15 text-warning border-warning/30',
    'Critical': 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return <Badge variant="outline" className={variants[priority]}>{priority}</Badge>;
}
