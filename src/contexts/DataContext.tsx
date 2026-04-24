import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Asset, AssetAssignment, Issue, ApprovalRequest, ApprovalStatus, IssueStatus, AssetType, AssetStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  productApi,
  intangibleApi,
  employeeApi,
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

function mapBackendStatusToFrontend(currentStatus: string | undefined, assignedTo?: string | null): AssetStatus {
  const normalizedStatus = normalizeStatus(currentStatus);
  const statusKey = normalizedStatus.toUpperCase();

  if (assignedTo) {
    return 'Assigned';
  }

  if (['AVAILABLE', 'IN STOCK', 'ACTIVE'].includes(statusKey)) {
    return 'Available';
  }

  if (['ASSIGNED', 'ISSUED'].includes(statusKey)) {
    return 'Assigned';
  }

  if (['RETURN REQUESTED', 'RETURN_REQUESTED'].includes(statusKey)) {
    return 'RETURN_REQUESTED';
  }

  return (normalizedStatus as AssetStatus) || 'Available';
}

function mapFrontendStatusToBackend(status: string | undefined, assetType: AssetType): string {
  const statusKey = normalizeStatus(status).toUpperCase();

  if (['AVAILABLE'].includes(statusKey)) {
    return assetType === 'Intangible' ? 'Active' : 'In stock';
  }

  if (['ASSIGNED'].includes(statusKey)) {
    return 'Assigned';
  }

  if (['RETURN REQUESTED', 'RETURN_REQUESTED'].includes(statusKey)) {
    return 'RETURN_REQUESTED';
  }

  if (['UNDER REPAIR', 'REPAIR'].includes(statusKey)) {
    return 'Under Repair';
  }

  if (['REPLACEMENT', 'RETIRED', 'OBSOLETE', 'DISPOSAL'].includes(statusKey)) {
    return normalizeStatus(status);
  }

  return status || (assetType === 'Intangible' ? 'Active' : 'In stock');
}

function getAssignedAssetStatus(currentStatus: string | undefined, assignedTo?: string | null): AssetStatus {
  return mapBackendStatusToFrontend(currentStatus, assignedTo);
}

function setIfPresent(payload: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim() === '') return;
  payload[key] = value;
}

function mapProductToAsset(product: Product): Asset {
  const productName = product.product_name || product.asset_name || product.assetName || product.name || '';
  const company = product.company || product.vendor_name || product.vendor || '';
  const purchaseDate = product.purchase_date || '';
  const condition = product.condition || '';
  return {
    id: String(product.id),
    name: productName,
    assetName: productName,
    type: 'Tangible' as AssetType,
    category: product.category || 'General',
    purchaseDate,
    warrantyPeriod: product.warranty_period || '',
    status: getAssignedAssetStatus(product.status, product.assigned_to),
    approvalStatus: (product.approval_status as ApprovalStatus) || 'Approved',
    assignedTo: product.assigned_to || undefined,
    createdBy: product.created_by || '',
    createdAt: purchaseDate,
    assignerLocation: product.assigner_location || '',
    company,
    condition,
    employeeContactNumber: product.employee_contact_number || '',
    employmentType: product.employment_type || '',
    assignerName: product.assigner_name || product.created_by || '',
    ownership: product.ownership || (product.vendor_name || product.vendor ? 'Vendor Asset' : 'Company-Owned'),
    // Tangible-specific
    serialNumber: product.serial_number || '',
    amount: product.amount,
    employeeName: product.employee_name || product.assigned_to || '',
    employeeLocation: product.employee_location || '',
    laptopModelNumber: product.laptop_model_number || '',
    laptopSpecifications: product.laptop_specifications || '',
    vendor: product.vendor_name || product.vendor || '',
    vendorName: product.vendor_name || '',
    location: product.assigner_location || '',
  };
}

function mapIntangibleToAsset(item: IntangibleAsset): Asset {
  const assetName = item.name || item.site_name || '';
  return {
    id: `INT-${item.id}`,
    name: assetName,
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
    employeeName: item.employee_name || item.assigned_to || '',
    employeeContactNumber: item.employee_contact_number || '',
    employmentType: item.employment_type || '',
    employeeLocation: item.employee_location || '',
    // Intangible-specific
    licenseKey: item.license_key || item.licenseKey || '',
    vendor: item.vendor || '',
    subscriptionType: item.subscription_type || item.Subscription_type || '',
    validityStartDate: item.validity_start_date || '',
    validityEndDate: item.validity_end_date || item.subscription_renewal_date || item.Subscription_renewal_date || '',
    renewalDate: item.renewal_date || item.subscription_renewal_date || item.Subscription_renewal_date || '',
    amountPaid: item.amount_paid ?? item.amount,
  };
}

function getAssetOrderValue(asset: Asset): number {
  const rawId = asset.type === 'Intangible' ? asset.id.replace('INT-', '') : asset.id;
  const numericId = Number(rawId);

  if (Number.isFinite(numericId) && numericId > 0) {
    return numericId;
  }

  const createdAtValue = Date.parse(asset.createdAt || asset.purchaseDate || '');
  return Number.isFinite(createdAtValue) ? createdAtValue : 0;
}

function sortAssetsNewestFirst(items: Asset[]): Asset[] {
  return [...items].sort((a, b) => getAssetOrderValue(b) - getAssetOrderValue(a));
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  username: string;
  name: string;
  email: string;
  phoneNumber?: string;
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
  addAsset: (asset: Partial<Asset> & { type: AssetType }) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
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
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
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
      const isDashboardRoute = pathname === '/' || pathname === '/dashboard';
      const isTangibleRoute = pathname === '/tangible-assets' || pathname === '/assets';
      const isIntangibleRoute = pathname === '/intangible-assets';

      // Fetch only the datasets needed by the active route.
      if (isDashboardRoute || isTangibleRoute) {
        const productsResult = await productApi.getAll();
        if (productsResult.ok && productsResult.data) {
          const products = productsResult.data.products || [];
          tangibleAssets = products.map(mapProductToAsset);
        }
      }

      if (isDashboardRoute || isIntangibleRoute) {
        const intangibleResult = await intangibleApi.getAll();
        if (intangibleResult.ok && intangibleResult.data) {
          const rawData = intangibleResult.data as unknown as { intangible_assets?: IntangibleAsset[] };
          const items = rawData.intangible_assets || (Array.isArray(intangibleResult.data) ? intangibleResult.data : []);
          intangibleAssets = items.map(mapIntangibleToAsset);
        }
      }

      setAssets(sortAssetsNewestFirst([...tangibleAssets, ...intangibleAssets]));

      if (isDashboardRoute || isTangibleRoute) {
        // Dashboard and tangible asset creation both need the employee directory.
        const empResult = await employeeApi.getAll();
        if (empResult.ok && empResult.data) {
          const rawEmp = empResult.data as unknown as { employees?: Employee[] };
          const empData = rawEmp.employees || (Array.isArray(empResult.data) ? empResult.data : []);
          setEmployees(
            empData.map((e: Employee) => ({
              id: String(e.id),
              username: e.username || '',
              name: e.name || '',
              email: e.email || '',
              phoneNumber: e.phone_number || '',
              role: e.department === 'Employee' ? 'employee' : e.department?.toLowerCase() || '',
              department: e.department || '',
            }))
          );
        }
      }

      // Legacy dashboard/admin data kept for reference only:
      // const approvalsResult = await assetRequestApi.getAll();
      // const repairsResult = await repairApi.getAll();
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pathname]);

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
  }, [isAuthenticated, pathname, refreshData]);

  // ── CRUD operations ──────────────────────────────────────────────────────

  const addAsset = useCallback(async (asset: Partial<Asset> & { type: AssetType }) => {
    if (asset.type === 'Tangible') {
      const backendStatus = mapFrontendStatusToBackend(asset.status, 'Tangible');
      const result = await productApi.add({
        assetName: asset.assetName || asset.name || '',
        assignedTo: asset.assignedTo || '',
        serialNumber: asset.serialNumber || '',
        name: asset.assignerName || '',
        createdBy: asset.assignerName || asset.createdBy || '',
        type: asset.type,
        category: asset.category,
        company: asset.company || asset.vendorName || asset.vendor || '',
        purchaseDate: asset.purchaseDate || '',
        warrantyPeriod: asset.warrantyPeriod || '',
        status: backendStatus,
        condition: asset.condition || 'New',
        approvalStatus: asset.approvalStatus || 'Approved',
        assignerLocation: asset.assignerLocation || '',
        employeeName: asset.employeeName || asset.assignedTo || '',
        employeeContactNumber: asset.employeeContactNumber || '',
        employmentType: asset.employmentType || '',
        employeeLocation: asset.employeeLocation || '',
        ownership: asset.ownership || (asset.vendorName || asset.vendor ? 'Vendor Asset' : 'Company-Owned'),
        vendorName: asset.vendorName || asset.vendor || '',
        laptopModelNumber: asset.laptopModelNumber || '',
        laptopSpecifications: asset.laptopSpecifications || '',
        amount: asset.amount || 0,
      });
      if (result.ok) {
        await refreshData();
      }
    } else {
      const backendStatus = mapFrontendStatusToBackend(asset.status, 'Intangible');
      const result = await intangibleApi.add({
        name: asset.name,
        assignedTo: asset.assignedTo || asset.employeeName || '',
        type: asset.type,
        category: asset.category,
        purchaseDate: asset.purchaseDate,
        warrantyPeriod: asset.warrantyPeriod,
        validityStartDate: asset.validityStartDate || asset.purchaseDate,
        validityEndDate: asset.validityEndDate || asset.warrantyPeriod,
        renewalDate: asset.renewalDate || '',
        vendor: asset.vendor,
        subscriptionType: asset.subscriptionType,
        licenseKey: asset.licenseKey,
        createdBy: asset.createdBy || '',
        assignerLocation: asset.assignerLocation || '',
        employeeName: asset.employeeName || asset.assignedTo || '',
        employeeContactNumber: asset.employeeContactNumber || '',
        employmentType: asset.employmentType || '',
        employeeLocation: asset.employeeLocation || '',
        approvalStatus: asset.approvalStatus || 'Approved',
        status: backendStatus,
        amountPaid: asset.amountPaid || asset.amount || 0,
      });
      if (result.ok) {
        await refreshData();
      }
    }
  }, [refreshData]);

  const updateAsset = useCallback(async (id: string, updates: Partial<Asset>) => {
    const currentAsset = assets.find(a => a.id === id);
    const toStatusKey = (value?: string) => (value || '').trim().toUpperCase().replace(/\s+/g, '_');

    // Determine if tangible or intangible by checking ID prefix
    if (id.startsWith('INT-')) {
      const numericId = parseInt(id.replace('INT-', ''));
      const mergedStatus = updates.status || currentAsset?.status;
      const backendStatus = mapFrontendStatusToBackend(mergedStatus, 'Intangible');
      const payload: Record<string, unknown> = {
        name: updates.name ?? currentAsset?.name,
        category: updates.category ?? currentAsset?.category,
        vendor: updates.vendor ?? currentAsset?.vendor,
        subscription_type: updates.subscriptionType ?? currentAsset?.subscriptionType,
        license_key: updates.licenseKey ?? currentAsset?.licenseKey,
        status: backendStatus,
      };
      setIfPresent(payload, 'validity_start_date', updates.purchaseDate ?? currentAsset?.purchaseDate);
      setIfPresent(payload, 'validity_end_date', updates.warrantyPeriod ?? currentAsset?.warrantyPeriod);

      const result = await intangibleApi.update(numericId, payload);
      if (!result.ok) throw new Error(result.error || 'Failed to update intangible asset');
    } else {
      const numericId = parseInt(id, 10);
      const mergedStatus = updates.status || currentAsset?.status;
      const nextStatusKey = toStatusKey(mergedStatus);

      const payload: Record<string, unknown> = {
        assetName: updates.assetName ?? currentAsset?.assetName ?? currentAsset?.name ?? '',
        type: currentAsset?.type ?? 'Tangible',
        category: updates.category ?? currentAsset?.category ?? '',
        company: updates.company ?? currentAsset?.company ?? currentAsset?.vendorName ?? currentAsset?.vendor ?? '',
        warrantyPeriod: updates.warrantyPeriod ?? currentAsset?.warrantyPeriod ?? '',
        condition: updates.condition ?? currentAsset?.condition ?? '',
        serialNumber: updates.serialNumber ?? currentAsset?.serialNumber ?? '',
        status: mapFrontendStatusToBackend(mergedStatus, 'Tangible'),
        approvalStatus: updates.approvalStatus ?? currentAsset?.approvalStatus ?? 'Approved',
        name: updates.assignerName ?? currentAsset?.assignerName ?? currentAsset?.createdBy ?? '',
        assignerLocation: updates.assignerLocation ?? currentAsset?.assignerLocation ?? '',
        employeeName: updates.employeeName ?? currentAsset?.employeeName ?? '',
        employeeContactNumber: updates.employeeContactNumber ?? currentAsset?.employeeContactNumber ?? '',
        employmentType: updates.employmentType ?? currentAsset?.employmentType ?? '',
        employeeLocation: updates.employeeLocation ?? currentAsset?.employeeLocation ?? '',
        laptopModelNumber: updates.laptopModelNumber ?? currentAsset?.laptopModelNumber ?? '',
        laptopSpecifications: updates.laptopSpecifications ?? currentAsset?.laptopSpecifications ?? '',
      };
      setIfPresent(payload, 'purchaseDate', updates.purchaseDate ?? currentAsset?.purchaseDate);

      const assignedTo = updates.assignedTo ?? currentAsset?.assignedTo;
      if (assignedTo) {
        payload.assignedTo = assignedTo;
      }

      if (nextStatusKey === 'AVAILABLE') {
        payload.status = mapFrontendStatusToBackend('Available', 'Tangible');
      }

      const result = await productApi.update(numericId, payload);
      if (!result.ok) throw new Error(result.error || 'Failed to update tangible asset');
    }
    await refreshData();
  }, [assets, refreshData]);

  const deleteAsset = useCallback(async (id: string) => {
    const currentAsset = assets.find((asset) => asset.id === id);

    if (currentAsset?.type === 'Tangible') {
      const numericId = parseInt(id, 10);
      const result = await productApi.delete(numericId);
      if (!result.ok) throw new Error(result.error || 'Failed to delete tangible asset');
      await refreshData();
      return;
    }

    // Intangible delete endpoint is not wired yet, so keep the existing local fallback there.
    setAssets(prev => prev.filter(a => a.id !== id));
  }, [assets, refreshData]);

  const addAssignment = useCallback(async (assignment: Omit<AssetAssignment, 'id' | 'approvalStatus'>) => {
    // Legacy assignment flow kept for reference only.
    // const assetId = assignment.assetId;
    // const employeeId = parseInt(assignment.employeeId);
    // const selectedEmployee = employees.find(e => e.id === assignment.employeeId);
    // const employeeName = selectedEmployee?.name || assignment.employeeId;
    // if (assetId.startsWith('INT-')) { ... } else { ... }

    const id = `AS${String(Date.now()).slice(-4)}`;
    const newAssignment: AssetAssignment = { ...assignment, id, approvalStatus: 'Pending' };
    setAssignments(prev => [...prev, newAssignment]);
  }, []);

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

    // Legacy repair status sync kept for reference only.
    // const backendStatus = status === 'Resolved' ? 'Resolved' : status === 'In Review' ? 'In Progress' : status;
    // repairApi.updateStatus(parseInt(id), { status: backendStatus });
  }, []);

  const approveRequest = useCallback(async (id: string, approvedBy: string, comments?: string) => {
    // Legacy approval flow kept for reference only.
    // const result = await assetRequestApi.makeDecision(parseInt(id), { status: 'Approve' });
    // if (result.ok) { ... }
  }, []);

  const rejectRequest = useCallback(async (id: string, approvedBy: string, comments?: string) => {
    // Legacy rejection flow kept for reference only.
    // const result = await assetRequestApi.makeDecision(parseInt(id), { status: 'Reject' });
    // if (result.ok) { ... }
  }, []);

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
