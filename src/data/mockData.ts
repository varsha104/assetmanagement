import { User, Asset, AssetAssignment, Issue, ApprovalRequest } from '@/types';

export const users: User[] = [
  { id: 'u1', username: 'admin', name: 'System Admin', email: 'admin@company.com', role: 'admin', department: 'IT' },
  { id: 'u2', username: 'jack', name: 'Jack Wilson', email: 'jack@company.com', role: 'higher_management', department: 'Management' },
  { id: 'u3', username: 'mujgiln', name: 'Mujgiln Ahmed', email: 'mujgiln@company.com', role: 'hr_manager', department: 'HR' },
  { id: 'u4', username: 'teja', name: 'Teja Kumar', email: 'teja@company.com', role: 'hr_manager', department: 'HR' },
  { id: 'u5', username: 'employee', name: 'John Doe', email: 'john@company.com', role: 'employee', department: 'Engineering' },
  { id: 'u6', username: 'sarah', name: 'Sarah Smith', email: 'sarah@company.com', role: 'employee', department: 'Marketing' },
  { id: 'u7', username: 'mike', name: 'Mike Johnson', email: 'mike@company.com', role: 'employee', department: 'Engineering' },
];

export const credentials: Record<string, string> = {
  admin: 'admin123',
  jack: 'jack123',
  mujgiln: 'mujgiln123',
  teja: 'teja123',
  employee: 'emp123',
};

export const initialAssets: Asset[] = [
  { id: 'A001', name: 'MacBook Pro 16"', type: 'Tangible', category: 'Laptop', purchaseDate: '2024-01-15', warrantyPeriod: '2 years', status: 'Assigned', approvalStatus: 'Approved', assignedTo: 'u5', createdBy: 'u1', createdAt: '2024-01-15', assignerLocation: 'HQ', employeeName: 'John Doe', employeeContactNumber: '9999991111', employmentType: 'Permanent', employeeLocation: 'Hyderabad', serialNumber: 'MBP-001', laptopModelNumber: 'A2485', laptopSpecifications: 'M2 Pro, 32GB RAM, 1TB SSD', vendorName: 'Apple', location: 'Bengaluru' },
  { id: 'A002', name: 'Dell Monitor 27"', type: 'Tangible', category: 'Monitor', purchaseDate: '2024-02-20', warrantyPeriod: '3 years', status: 'Available', approvalStatus: 'Approved', createdBy: 'u1', createdAt: '2024-02-20', assignerLocation: 'HQ', employeeName: '', employeeContactNumber: '', employmentType: 'Contract', employeeLocation: '', serialNumber: 'DEL-2002', laptopModelNumber: '', laptopSpecifications: '27-inch IPS panel', vendorName: 'Dell', location: 'Hyderabad' },
  { id: 'A003', name: 'iPhone 15 Pro', type: 'Tangible', category: 'Mobile Phone', purchaseDate: '2024-03-10', warrantyPeriod: '1 year', status: 'Assigned', approvalStatus: 'Approved', assignedTo: 'u6', createdBy: 'u1', createdAt: '2024-03-10', assignerLocation: 'HQ', employeeName: 'Sarah Smith', employeeContactNumber: '8888882222', employmentType: 'Contract', employeeLocation: 'Vijayawada', serialNumber: 'IPH-003', laptopModelNumber: 'iPhone15,3', laptopSpecifications: '256GB, Blue Titanium', vendorName: 'Apple', location: 'Chennai' },
  { id: 'A004', name: 'Logitech MX Keys', type: 'Tangible', category: 'Keyboard', purchaseDate: '2024-04-05', warrantyPeriod: '2 years', status: 'Available', approvalStatus: 'Approved', createdBy: 'u1', createdAt: '2024-04-05', assignerLocation: 'Warehouse', employeeName: '', employeeContactNumber: '', employmentType: 'Permanent', serialNumber: 'KEY-004', laptopModelNumber: '', laptopSpecifications: 'Wireless keyboard', vendorName: 'Logitech', location: 'Pune' },
  { id: 'A005', name: 'Logitech MX Master 3', type: 'Tangible', category: 'Mouse', purchaseDate: '2024-04-05', warrantyPeriod: '2 years', status: 'Under Repair', approvalStatus: 'Approved', assignedTo: 'u7', createdBy: 'u1', createdAt: '2024-04-05', assignerLocation: 'Warehouse', employeeName: 'Mike Johnson', employeeContactNumber: '7777773333', employmentType: 'Permanent', serialNumber: 'MOU-005', laptopModelNumber: '', laptopSpecifications: 'Wireless mouse', vendorName: 'Logitech', location: 'Mumbai' },
  { id: 'A006', name: 'ThinkPad X1 Carbon', type: 'Tangible', category: 'Laptop', purchaseDate: '2024-05-01', warrantyPeriod: '3 years', status: 'Available', approvalStatus: 'Pending', createdBy: 'u1', createdAt: '2024-05-01', assignerLocation: 'HQ', employeeName: '', employeeContactNumber: '', employmentType: 'Permanent', serialNumber: 'THK-006', laptopModelNumber: '20XW', laptopSpecifications: 'Intel i7, 16GB RAM, 512GB SSD', vendorName: 'Lenovo', location: 'Delhi' },
  { id: 'A007', name: 'Adobe Creative Cloud', type: 'Intangible', category: 'Software License', purchaseDate: '2024-01-01', warrantyPeriod: '1 year', status: 'Assigned', approvalStatus: 'Approved', assignedTo: 'u6', createdBy: 'u1', createdAt: '2024-01-01', assignerLocation: 'HQ', employeeName: 'Sarah Smith', employeeContactNumber: '8888882222', employmentType: 'Contract', subscriptionType: 'Annual', validityStartDate: '2024-01-01', validityEndDate: '2025-01-01', renewalDate: '2024-12-15', amountPaid: 25000 },
  { id: 'A008', name: 'Microsoft 365 Business', type: 'Intangible', category: 'Software License', purchaseDate: '2024-01-01', warrantyPeriod: '1 year', status: 'Assigned', approvalStatus: 'Approved', assignedTo: 'u5', createdBy: 'u1', createdAt: '2024-01-01', assignerLocation: 'HQ', employeeName: 'John Doe', employeeContactNumber: '9999991111', employmentType: 'Permanent', subscriptionType: 'Monthly', validityStartDate: '2024-01-01', validityEndDate: '2024-12-31', renewalDate: '2024-12-20', amountPaid: 18000 },
  { id: 'A009', name: 'NordVPN Business', type: 'Intangible', category: 'VPN Access', purchaseDate: '2024-02-15', warrantyPeriod: '1 year', status: 'Available', approvalStatus: 'Approved', createdBy: 'u1', createdAt: '2024-02-15', assignerLocation: 'HQ', employeeName: '', employeeContactNumber: '', employmentType: 'Contract', subscriptionType: 'Annual', validityStartDate: '2024-02-15', validityEndDate: '2025-02-14', renewalDate: '2025-02-01', amountPaid: 12000 },
  { id: 'A010', name: 'AWS Cloud Subscription', type: 'Intangible', category: 'Cloud Subscription', purchaseDate: '2024-03-01', warrantyPeriod: '1 year', status: 'Assigned', approvalStatus: 'Approved', assignedTo: 'u7', createdBy: 'u1', createdAt: '2024-03-01', assignerLocation: 'HQ', employeeName: 'Mike Johnson', employeeContactNumber: '7777773333', employmentType: 'Permanent', subscriptionType: 'Annual', validityStartDate: '2024-03-01', validityEndDate: '2025-02-28', renewalDate: '2025-02-10', amountPaid: 45000 },
  { id: 'A011', name: 'SSL Certificate', type: 'Intangible', category: 'Digital Certificate', purchaseDate: '2024-06-01', warrantyPeriod: '1 year', status: 'Available', approvalStatus: 'Pending', createdBy: 'u1', createdAt: '2024-06-01', assignerLocation: 'HQ', employeeName: '', employeeContactNumber: '', employmentType: 'Permanent', subscriptionType: 'Annual', validityStartDate: '2024-06-01', validityEndDate: '2025-05-31', renewalDate: '2025-05-20', amountPaid: 6000 },
  { id: 'A012', name: 'Desktop Workstation', type: 'Tangible', category: 'Desktop', purchaseDate: '2024-07-01', warrantyPeriod: '3 years', status: 'Retired', approvalStatus: 'Approved', createdBy: 'u1', createdAt: '2024-07-01', assignerLocation: 'Branch Office', employeeName: '', employeeContactNumber: '', employmentType: 'Contract', serialNumber: 'DTP-012', laptopModelNumber: 'DX900', laptopSpecifications: 'Intel i5, 8GB RAM, 256GB SSD', vendorName: 'HP', location: 'Kochi' },
];

export const initialAssignments: AssetAssignment[] = [
  { id: 'AS001', assetId: 'A001', employeeId: 'u5', assignedDate: '2024-01-20', approvalStatus: 'Approved', approvedBy: 'u3', createdBy: 'u1' },
  { id: 'AS002', assetId: 'A003', employeeId: 'u6', assignedDate: '2024-03-15', approvalStatus: 'Approved', approvedBy: 'u2', createdBy: 'u1' },
  { id: 'AS003', assetId: 'A007', employeeId: 'u6', assignedDate: '2024-01-05', approvalStatus: 'Approved', approvedBy: 'u3', createdBy: 'u1' },
  { id: 'AS004', assetId: 'A008', employeeId: 'u5', assignedDate: '2024-01-05', approvalStatus: 'Approved', approvedBy: 'u4', createdBy: 'u1' },
  { id: 'AS005', assetId: 'A010', employeeId: 'u7', assignedDate: '2024-03-05', approvalStatus: 'Approved', approvedBy: 'u3', createdBy: 'u1' },
  { id: 'AS006', assetId: 'A005', employeeId: 'u7', assignedDate: '2024-04-10', approvalStatus: 'Approved', approvedBy: 'u2', createdBy: 'u1' },
];

export const initialIssues: Issue[] = [
  { id: 'I001', assetId: 'A005', raisedBy: 'u7', description: 'Mouse scroll wheel not working properly', priority: 'Medium', status: 'In Review', createdAt: '2024-06-15' },
  { id: 'I002', assetId: 'A001', raisedBy: 'u5', description: 'Laptop battery draining fast, need replacement', priority: 'High', status: 'Open', createdAt: '2024-06-20' },
  { id: 'I003', assetId: 'A008', raisedBy: 'u5', description: 'Microsoft 365 license expired, unable to access apps', priority: 'Critical', status: 'Escalated', createdAt: '2024-06-18', escalatedTo: 'u1' },
  { id: 'I004', assetId: 'A003', raisedBy: 'u6', description: 'Phone screen cracked after accidental drop', priority: 'High', status: 'Resolved', createdAt: '2024-05-10', resolvedAt: '2024-05-15', resolvedBy: 'u1', resolution: 'Screen replaced under warranty' },
];

export const initialApprovals: ApprovalRequest[] = [
  { id: 'AP001', type: 'asset_creation', referenceId: 'A006', requestedBy: 'u1', requestedAt: '2024-05-01', status: 'Pending' },
  { id: 'AP002', type: 'asset_creation', referenceId: 'A011', requestedBy: 'u1', requestedAt: '2024-06-01', status: 'Pending' },
];
