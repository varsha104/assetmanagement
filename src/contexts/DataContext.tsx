import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Asset, AssetAssignment, Issue, ApprovalRequest, ApprovalStatus, IssueStatus, AssetType, AssetStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  productApi,
  intangibleApi,
  employeeApi,
  assetRequestApi,
  repairApi,
  Product,
  IntangibleAsset,
  Employee,
  Repair,
} from '@/services/api';

// ─── Map backend product to frontend Asset type ────────────────────────────

function normalizeStatus(s: string | undefined): string {
  if (!s) return 'Available';
  // If it's something like "IN_STOCK" or "IN STOCK", convert to "In Stock"
  return s.split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getAssignedAssetStatus(currentStatus: string | undefined, assignedTo?: string | null, userId?: number | null): AssetStatus {
  const normalizedStatus = normalizeStatus(currentStatus);
  const preservedStatuses = new Set(['OBSOLETE', 'DISPOSAL', 'RETIRED', 'RETURN REQUESTED', 'RETURN_REQUESTED']);

  if (preservedStatuses.has(normalizedStatus.toUpperCase())) {
    return normalizedStatus as AssetStatus;
  }

  if (assignedTo || userId) {
    return 'Assigned';
  }

  return (normalizedStatus as AssetStatus) || 'Available';
}

function mapProductToAsset(product: Product): Asset {
  return {
    id: String(product.id),
    name: product.product_name || '',
    type: 'Tangible' as AssetType,
    category: product.category || 'General',
    purchaseDate: product.purchase_date || '',
    warrantyPeriod: '',
    status: getAssignedAssetStatus(product.status, product.assigned_to, product.user_id),
    approvalStatus: 'Approved' as ApprovalStatus,
    assignedTo: product.assigned_to || undefined,
    createdBy: '',
    createdAt: product.purchase_date || '',
    assignerLocation: product.assigner_location || product.Location || '',
    employeeContactNumber: product.employee_contact_number || '',
    employmentType: product.employment_type || '',
    // Tangible-specific
    serialNumber: product.serial_number || '',
    company: product.company || '',
    condition: product.condition || '',
    amount: product.amount,
    employeeName: product.assigned_to || '',
    employeeLocation: product.employee_location || '',
    location: product.location || product.Location || '',
    laptopModelNumber: product.laptop_model_number || '',
    laptopSpecifications: product.laptop_specifications || '',
    vendor: product.vendor_name || '',
    vendorName: product.vendor_name || '',
  };
}

function mapIntangibleToAsset(item: IntangibleAsset): Asset {
  return {
    id: `INT-${item.id}`,
    name: item.name || item.site_name || '',
    type: 'Intangible' as AssetType,
    category: item.category || 'Subscription',
    purchaseDate: item.validity_start_date || '',
    warrantyPeriod: item.validity_end_date || '',
    status: getAssignedAssetStatus(item.status, item.assigned_to),
    approvalStatus: (item.approval_status as ApprovalStatus) || 'Approved',
    assignedTo: item.assigned_to || undefined,
    createdBy: '',
    createdAt: item.validity_start_date || '',
    assignerLocation: item.assigner_location || '',
    employeeContactNumber: item.employee_contact_number || '',
    employmentType: item.employment_type || '',
    // Intangible-specific
    licenseKey: item.license_key || item.licenseKey || '',
    vendor: item.vendor || '',
    subscriptionType: item.subscription_type || '',
    validityStartDate: item.validity_start_date || '',
    validityEndDate: item.validity_end_date || item.subscription_renewal_date || '',
    renewalDate: item.renewal_date || item.subscription_renewal_date || '',
    amountPaid: item.amount_paid ?? item.amount,
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface DataContextType {
  assets: Asset[];
  assignments: AssetAssignment[];
  issues: Issue[];
  approvals: ApprovalRequest[];
  employees: UserInfo[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'approvalStatus'>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => void;
  addAssignment: (assignment: Omit<AssetAssignment, 'id' | 'approvalStatus'>) => void;
  returnAsset: (assignmentId: string) => void;
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateIssueStatus: (id: string, status: IssueStatus, extra?: Partial<Issue>) => void;
  approveRequest: (id: string, approvedBy: string, comments?: string) => Promise<void>;
  rejectRequest: (id: string, approvedBy: string, comments?: string) => Promise<void>;
  getAssetById: (id: string) => Asset | undefined;
  getUserById: (id: string) => UserInfo | undefined;
  getEmployees: () => UserInfo[];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [employees, setEmployees] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch all data from backend ──────────────────────────────────────────

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      let tangibleAssets: Asset[] = [];
      let intangibleAssets: Asset[] = [];

      if (user && user.role === 'employee') {
        const userIdNum = Number(user.id);
        const empResult = await employeeApi.getEmployeeAssets(userIdNum);
        if (empResult.ok && empResult.data) {
          const products = empResult.data.products || [];
          const intAssets = empResult.data.intangible_assets || [];
          tangibleAssets = products.map(p => ({
            ...mapProductToAsset(p),
            assignedTo: user.name || user.username || 'Me'
          }));
          intangibleAssets = intAssets.map(i => ({
            ...mapIntangibleToAsset(i),
            assignedTo: user.name || user.username || 'Me'
          }));
        }
      } else {
        // Fetch tangible products
        const productsResult = await productApi.getAll();
        if (productsResult.ok && productsResult.data) {
          const products = productsResult.data.products || [];
          tangibleAssets = products.map(mapProductToAsset);
        }

        // Fetch intangible assets
        const intangibleResult = await intangibleApi.getAll();
        if (intangibleResult.ok && intangibleResult.data) {
          const rawData = intangibleResult.data as unknown as { intangible_assets?: IntangibleAsset[] };
          const items = rawData.intangible_assets || (Array.isArray(intangibleResult.data) ? intangibleResult.data : []);
          intangibleAssets = items.map(mapIntangibleToAsset);
        }
      }

      setAssets([...tangibleAssets, ...intangibleAssets]);

      // Fetch employees
      const empResult = await employeeApi.getAll();
      if (empResult.ok && empResult.data) {
        // Backend returns { employees: [...] }
        const rawEmp = empResult.data as unknown as { employees?: Employee[] };
        const empData = rawEmp.employees || (Array.isArray(empResult.data) ? empResult.data : []);
        setEmployees(
          empData.map((e: Employee) => ({
            id: String(e.id),
            username: e.username || '',
            name: e.name || '',
            email: e.email || '',
            role: e.department === 'Employee' ? 'employee' : e.department?.toLowerCase() || '',
            department: e.department || '',
          }))
        );
      }

      // Fetch asset approval requests
      const approvalsResult = await assetRequestApi.getAll();
      const pendingApprovalsResult = await assetRequestApi.getPendingApprovals();

      if (approvalsResult.ok && approvalsResult.data) {
        const approvalItems = Array.isArray(approvalsResult.data) ? approvalsResult.data : [];
        setApprovals(
          approvalItems.map((item) => ({
            id: String(item.id),
            type: 'asset_creation' as const,
            referenceId: String(item.id),
            requestedBy: '',
            requestedAt: '',
            status: ((item.approval_status || item.status) as ApprovalStatus) || 'Pending',
          }))
        );
      } else if (pendingApprovalsResult.ok && pendingApprovalsResult.data) {
        const pendingItems = pendingApprovalsResult.data.pending_assets || [];
        setApprovals(
          pendingItems.map((item) => ({
            id: String(item.id),
            type: 'asset_creation' as const,
            referenceId: String(item.id),
            requestedBy: '',
            requestedAt: '',
            status: ((item.approval_status || item.status) as ApprovalStatus) || 'Pending',
          }))
        );
      }

      // Fetch repairs as issues
      const repairsResult = await repairApi.getAll();
      if (repairsResult.ok && repairsResult.data) {
        // Backend returns { repairs: [...] }
        const rawRepairs = repairsResult.data as unknown as { repairs?: Repair[] };
        const repairItems = rawRepairs.repairs || (Array.isArray(repairsResult.data) ? repairsResult.data : []);
        setIssues(
          repairItems.map((r) => ({
            id: String(r.id),
            assetId: String(r.product_id),
            raisedBy: String(r.user_id),
            description: r.issue_description || '',
            priority: 'Medium' as const,
            status: (normalizeStatus(r.status) as IssueStatus) || 'Open',
            createdAt: r.repair_date || '',
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-fetch on authentication
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      // Clear data on logout
      setAssets([]);
      setAssignments([]);
      setIssues([]);
      setApprovals([]);
      setEmployees([]);
    }
  }, [isAuthenticated, refreshData]);

  // ── CRUD operations ──────────────────────────────────────────────────────

  const addAsset = useCallback(async (asset: Omit<Asset, 'id' | 'createdAt' | 'approvalStatus'>) => {
    if (asset.type === 'Tangible') {
      const result = await productApi.add({
        product_name: asset.name,
        company: asset.company || '',
        category: asset.category,
        serial_number: asset.serialNumber || '',
        purchase_date: asset.purchaseDate,
        condition: asset.condition || 'New',
        status: asset.status || 'Available',
        assigned_to: asset.assignedTo || asset.employeeName || '',
        assigner_location: asset.assignerLocation || '',
        employee_contact_number: asset.employeeContactNumber || '',
        employment_type: asset.employmentType || '',
        employee_location: asset.employeeLocation || '',
        laptop_model_number: asset.laptopModelNumber || '',
        laptop_specifications: asset.laptopSpecifications || '',
        vendor_name: asset.vendorName || asset.vendor || '',
        amount: asset.amount || 0,
        location: asset.location || '',
      });
      if (result.ok) {
        await refreshData();
      }
    } else {
      const result = await intangibleApi.add({
        name: asset.name,
        site_name: asset.name,
        category: asset.category,
        validity_start_date: asset.purchaseDate,
        validity_end_date: asset.warrantyPeriod,
        vendor: asset.vendor,
        subscription_type: asset.subscriptionType,
        license_key: asset.licenseKey,
        assigned_to: asset.assignedTo || asset.employeeName || '',
        assigner_location: asset.assignerLocation || '',
        employee_contact_number: asset.employeeContactNumber || '',
        employment_type: asset.employmentType || '',
        employee_location: asset.employeeLocation || '',
        renewal_date: asset.renewalDate || '',
        amount_paid: asset.amountPaid || asset.amount || 0,
      });
      if (result.ok) {
        await refreshData();
      }
    }
  }, [refreshData]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    const toStatusKey = (value?: string) => (value || '').trim().toUpperCase().replace(/\s+/g, '_');

    // Determine if tangible or intangible by checking ID prefix
    if (id.startsWith('INT-')) {
      const numericId = parseInt(id.replace('INT-', ''));
      const result = await intangibleApi.update(numericId, {
        name: updates.name,
        category: updates.category,
        validity_start_date: updates.purchaseDate,
        validity_end_date: updates.warrantyPeriod,
        vendor: updates.vendor,
        subscription_type: updates.subscriptionType,
        license_key: updates.licenseKey,
        assigned_to: updates.assignedTo || updates.employeeName,
        assigner_location: updates.assignerLocation,
        employee_contact_number: updates.employeeContactNumber,
        employment_type: updates.employmentType,
        employee_location: updates.employeeLocation,
        renewal_date: updates.renewalDate,
        amount_paid: updates.amountPaid,
      });
      if (!result.ok) throw new Error(result.error || 'Failed to update intangible asset');
    } else {
      const numericId = parseInt(id, 10);
      const currentAsset = assets.find(a => a.id === id);
      const previousStatusKey = toStatusKey(currentAsset?.status);
      const nextStatusKey = toStatusKey(updates.status);
      const isReturnRequestedToAvailable =
        previousStatusKey === 'RETURN_REQUESTED' && nextStatusKey === 'AVAILABLE';

      if (isReturnRequestedToAvailable) {
        const verifyResult = await productApi.itadminVerifyReturn(numericId);
        if (!verifyResult.ok) {
          throw new Error(verifyResult.error || 'Failed to verify return request');
        }
      }

      const payload: Record<string, unknown> = {
        product_name: updates.name,
        category: updates.category,
        company: updates.company,
        serial_number: updates.serialNumber,
        purchase_date: updates.purchaseDate,
        condition: updates.condition,
        status: updates.status,
        assigned_to: updates.assignedTo || updates.employeeName,
        assigner_location: updates.assignerLocation,
        employee_contact_number: updates.employeeContactNumber,
        employment_type: updates.employmentType,
        employee_location: updates.employeeLocation,
        laptop_model_number: updates.laptopModelNumber,
        laptop_specifications: updates.laptopSpecifications,
        vendor_name: updates.vendorName || updates.vendor,
        amount: updates.amount || 0,
        location: updates.location,
      };

      if (nextStatusKey === 'AVAILABLE') {
        payload.user_id = null;
        payload.assigned_to = null;
        payload.Location = null;
      }

      const result = await productApi.update(numericId, payload);
      if (!result.ok) throw new Error(result.error || 'Failed to update tangible asset');
    }
    await refreshData();
  }, [assets, refreshData]);

  const deleteAsset = useCallback((id: string) => {
    // Remove from local state (backend delete not available in existing API)
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const addAssignment = useCallback(async (assignment: Omit<AssetAssignment, 'id' | 'approvalStatus'>) => {
    const assetId = assignment.assetId;
    const employeeId = parseInt(assignment.employeeId);
    const selectedEmployee = employees.find(e => e.id === assignment.employeeId);
    const employeeName = selectedEmployee?.name || assignment.employeeId;

    // Check if tangible or intangible
    if (assetId.startsWith('INT-')) {
      const res = await intangibleApi.assignToEmployee(employeeId, {
        asset_id: parseInt(assetId.replace('INT-', '')),
        assigned_to: employeeName,
        location: assignment.location || undefined,
      });
      if (!res.ok) throw new Error(res.error || 'Failed to assign intangible asset');
    } else {
      const res = await productApi.assignEmployee(parseInt(assetId), {
        user_id: employeeId,
        location: assignment.location || '',
      });
      if (!res.ok) throw new Error(res.error || 'Failed to assign tangible asset');
    }

    setAssets(prev =>
      prev.map(asset =>
        asset.id === assetId
          ? {
              ...asset,
              assignedTo: employeeName,
              employeeName,
              location: assignment.location || asset.location,
              status: 'Assigned',
            }
          : asset
      )
    );

    // Optimistic update
    const id = `AS${String(Date.now()).slice(-4)}`;
    const newAssignment: AssetAssignment = { ...assignment, id, approvalStatus: 'Pending' };
    setAssignments(prev => [...prev, newAssignment]);

    // Refresh data after assignment
    await refreshData();
  }, [employees, refreshData]);

  const returnAsset = useCallback((assignmentId: string) => {
    setAssignments(prev =>
      prev.map(a => {
        if (a.id === assignmentId) {
          setAssets(old =>
            old.map(asset =>
              asset.id === a.assetId ? { ...asset, status: 'Available', assignedTo: undefined } : asset
            )
          );
          return { ...a, returnDate: new Date().toISOString().split('T')[0] };
        }
        return a;
      })
    );
  }, []);

  const addIssue = useCallback(async (issue: Omit<Issue, 'id' | 'createdAt' | 'status'>) => {
    const result = await repairApi.addIssue({
      issue_description: issue.description,
      serial_number: '',
      user_id: parseInt(issue.raisedBy),
      product_id: parseInt(issue.assetId),
    });
    if (result.ok) {
      await refreshData();
    }
  }, [refreshData]);

  const updateIssueStatus = useCallback((id: string, status: IssueStatus, extra?: Partial<Issue>) => {
    setIssues(prev => prev.map(i => (i.id === id ? { ...i, status, ...extra } : i)));

    // Sync repair status to backend
    const backendStatus = status === 'Resolved' ? 'Resolved' : status === 'In Review' ? 'In Progress' : status;
    repairApi.updateStatus(parseInt(id), { status: backendStatus });
  }, []);

  const approveRequest = useCallback(async (id: string, approvedBy: string, comments?: string) => {
    const result = await assetRequestApi.makeDecision(parseInt(id), { status: 'Approve' });
    if (result.ok) {
      setApprovals(prev =>
        prev.map(a =>
          a.id === id
            ? {
              ...a,
              status: 'Approved' as ApprovalStatus,
              approvedBy,
              approvedAt: new Date().toISOString().split('T')[0],
              comments,
            }
            : a
        )
      );
      await refreshData();
    }
  }, [refreshData]);

  const rejectRequest = useCallback(async (id: string, approvedBy: string, comments?: string) => {
    const result = await assetRequestApi.makeDecision(parseInt(id), { status: 'Reject' });
    if (result.ok) {
      setApprovals(prev =>
        prev.map(a =>
          a.id === id
            ? {
              ...a,
              status: 'Rejected' as ApprovalStatus,
              approvedBy,
              approvedAt: new Date().toISOString().split('T')[0],
              comments,
            }
            : a
        )
      );
      await refreshData();
    }
  }, [refreshData]);

  const getAssetById = useCallback((id: string) => assets.find(a => a.id === id), [assets]);
  const getUserById = useCallback((id: string) => employees.find(u => u.id === id), [employees]);
  const getEmployees = useCallback(() => employees.filter(u => u.role === 'employee' || u.department === 'Employee'), [employees]);

  return (
    <DataContext.Provider
      value={{
        assets,
        assignments,
        issues,
        approvals,
        employees,
        isLoading,
        refreshData,
        addAsset,
        updateAsset,
        deleteAsset,
        addAssignment,
        returnAsset,
        addIssue,
        updateIssueStatus,
        approveRequest,
        rejectRequest,
        getAssetById,
        getUserById,
        getEmployees,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
