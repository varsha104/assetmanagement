export type UserRole = 'admin' | 'higher_management' | 'hr_manager' | 'employee' | 'accounts' | 'it_admin';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export type AssetType = 'Tangible' | 'Intangible';
export type AssetStatus = 'Available' | 'Assigned' | 'Under Repair' | 'Retired' | 'RETURN_REQUESTED' | string;
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  purchaseDate: string;
  warrantyPeriod: string;
  status: AssetStatus;
  approvalStatus: ApprovalStatus;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  assignerLocation?: string;
  employeeContactNumber?: string;
  employmentType?: 'Permanent' | 'Contract' | string;
  // Tangible-specific
  serialNumber?: string;
  company?: string;
  condition?: string;
  amount?: number;
  employeeName?: string;
  location?: string;
  laptopModelNumber?: string;
  laptopSpecifications?: string;
  vendorName?: string;
  // Intangible-specific
  licenseKey?: string;
  vendor?: string;
  subscriptionType?: string;
  validityStartDate?: string;
  validityEndDate?: string;
  renewalDate?: string;
  amountPaid?: number;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  requestId?: number | string;
  assignedDate: string;
  returnDate?: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  createdBy: string;
  location?: string;
}

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'In Review' | 'Escalated' | 'Resolved' | string;

export interface Issue {
  id: string;
  assetId: string;
  raisedBy: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  escalatedTo?: string;
  resolution?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'asset_creation' | 'asset_assignment';
  referenceId: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
}
