/**
 * Centralized API Service
 * All backend API calls go through this module for consistency.
 * Backend base URL is proxied via vite.config.ts → http://127.0.0.1:5002
 */

const API_BASE = '/api';

// ─── Generic Request Helper ─────────────────────────────────────────────────

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    ok: boolean;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        const raw = await response.text();
        let data: unknown = null;

        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch {
                data = raw;
            }
        }

        if (!response.ok) {
            const errorMessage =
                typeof data === 'object' && data !== null
                    ? (data as { error?: string; message?: string }).error ||
                      (data as { error?: string; message?: string }).message
                    : null;

            return {
                data: null,
                error: errorMessage || response.statusText || `Request failed (${response.status})`,
                ok: false,
            };
        }

        return { data: data as T, error: null, ok: true };
    } catch (err) {
        console.error(`API Error [${endpoint}]:`, err);
        return {
            data: null,
            error: 'Network error. Please check your connection.',
            ok: false,
        };
    }
}

// ─── Auth APIs ──────────────────────────────────────────────────────────────

export interface LoginPayload {
    username: string;
    password: string;
}

export interface LoginResponse {
    id: number;
    username: string;
    email: string;
    department: string;
    message?: string;
}

export const authApi = {
    login: (payload: LoginPayload) =>
        request<LoginResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    register: (payload: {
        name: string;
        email: string;
        username: string;
        department: string;
    }) =>
        request<{ message: string }>('/register', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    changePassword: (payload: {
        email: string;
        old_password: string;
        new_password: string;
        confirm_password: string;
    }) =>
        request<{ message: string }>('/change-password', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── Tangible Asset (Product) APIs ──────────────────────────────────────────

export interface Product {
    id: number;
    product_name: string;
    asset_name?: string;
    company: string;
    serial_number: string;
    condition: string;
    purchase_date: string;
    status: string;
    amount?: number;
    assigned_to?: string | null;
    user_id?: number | null;
    Location?: string;
    location?: string;
    category?: string;
    assigner_location?: string;
    employee_contact_number?: string;
    employment_type?: string;
    employee_location?: string;
    laptop_model_number?: string;
    laptop_specifications?: string;
    vendor_name?: string;
}

export const productApi = {
    /** Get all products (tangible assets) */
    getAll: () =>
        request<{ products: Product[] }>('/products', { method: 'GET' }),

    /** Add a new tangible product */
    add: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_product', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Update a tangible product */
    update: (id: number, payload: Record<string, unknown>) =>
        request<{ message: string }>(`/products/update/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Assign employee to a tangible product */
    assignEmployee: (productId: number, payload: { user_id: string | number; location: string }) =>
        request<{ message: string }>(`/assign_employee/${productId}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Get tangible report summary */
    getReportSummary: () =>
        request<unknown>('/reports/product_summary', { method: 'GET' }),

    /** Employee verify return (hijacked route) */
    verifyReturn: (productId: number) =>
        request<{ message: string }>(`/employee-return-asset/${productId}`, {
            method: 'POST',
        }),

    /** IT Admin verify return accepted */
    itadminVerifyReturn: (productId: number) =>
        request<{ message: string }>(`/verify-return/${productId}`, {
            method: 'POST',
        }),

    /** Mark asset obsolete / disposal */
    markAssetObsolete: (productId: number) =>
        request<{ message: string }>(`/mark-asset-obsolete/${productId}`, {
            method: 'POST',
        }),

    /** Higher Management dispose asset */
    hmDisposeAsset: (productId: number) =>
        request<{ message: string }>(`/management-approve-disposal/${productId}`, {
            method: 'POST',
        }),
};

// ─── Intangible Asset APIs ──────────────────────────────────────────────────

export interface IntangibleAsset {
    id: number;
    name: string;
    site_name?: string;
    amount?: number;
    months?: number;
    validity_start_date?: string;
    validity_end_date?: string;
    renewal_date?: string;
    status?: string;
    assigned_to?: string;
    approval_status?: string;
    license_key?: string;
    licenseKey?: string;
    vendor?: string;
    subscription_type?: string;
    subscription_renewal_date?: string;
    category?: string;
    assigner_location?: string;
    employee_contact_number?: string;
    employment_type?: string;
    amount_paid?: number;
}

export const intangibleApi = {
    /** Get all intangible assets */
    getAll: () =>
        request<IntangibleAsset[]>('/intangible_assets', { method: 'GET' }),

    /** Add a new intangible asset */
    add: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_intangible_asset', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Update an intangible asset */
    update: (id: number, payload: Record<string, unknown>) =>
        request<{ message: string }>(`/update_intangible_asset/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Assign intangible assets to an employee */
    assignToEmployee: (employeeId: number, payload: { asset_id: number; assigned_to: string; location?: string }) =>
        request<{ message: string }>(`/assign-intangible-assets/${employeeId}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Get intangible report summary */
    getReportSummary: () =>
        request<unknown>('/reports/intangible_summary', { method: 'GET' }),

    /** Get intangible assets pending approval */
    getIntangibleForApproval: () =>
        request<IntangibleAsset[]>('/get-intangible-assets', { method: 'GET' }),

    /** Approve/Reject intangible asset request */
    updateApprovalStatus: (id: number, payload: { approval_status: string }) =>
        request<{ message: string }>(`/intangible-assets/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── Employee APIs ──────────────────────────────────────────────────────────

export interface Employee {
    id: number;
    name: string;
    email: string;
    username: string;
    department: string;
}

export const employeeApi = {
    /** Get all employees */
    getAll: () =>
        request<Employee[]>('/employees', { method: 'GET' }),

    /** Get assets assigned to a specific employee */
    getEmployeeAssets: (employeeId: number) =>
        request<{ products: Product[]; intangible_assets: IntangibleAsset[] }>(
            `/api/assets/${employeeId}`,
            { method: 'GET' }
        ),

    /** Get intangible assets for a specific employee */
    getEmployeeIntangibleAssets: (employeeId: number) =>
        request<IntangibleAsset[]>(`/intangible-assets/${employeeId}`, {
            method: 'GET',
        }),

    /** Employee initiate exit */
    initiateExit: (payload: { user_id: number }) =>
        request<{ message: string }>('/initiate-exit', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── Asset Request / Approval APIs ──────────────────────────────────────────

export interface AssetRequest {
    id: number;
    name: string;
    company: string;
    amount: number;
    status: string;
    number?: number;
    approval_status?: string;
}

export const assetRequestApi = {
    /** Get all asset approval requests (HR) */
    getAll: () =>
        request<AssetRequest[]>('/assets', { method: 'GET' }),

    /** Submit new asset request (Technician) */
    submitRequest: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/assets/request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Approve or Reject an asset request (decision) */
    makeDecision: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/assets/decision/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Get pending additional asset approval requests */
    getPendingApprovals: () =>
        request<{ pending_assets: AssetRequest[] }>('/pending_approval_assets', {
            method: 'GET',
        }),

    /** Update approval status of an additional asset */
    updateApprovalStatus: (id: number, payload: { approval_status: string }) =>
        request<{ message: string }>(`/update_approval_status/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── Additional Asset APIs ──────────────────────────────────────────────────

export const additionalAssetApi = {
    /** Request additional tangible asset */
    addTangible: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_additional_asset', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Request additional intangible asset */
    addIntangible: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/additional_intangible_asset', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── Repair / Issue APIs ────────────────────────────────────────────────────

export interface Repair {
    id: number;
    product_id: number;
    serial_number?: string;
    product?: string;
    issue_description: string;
    message?: string;
    repair_center?: string;
    status: string;
    user_id: number;
    repair_date?: string;
    return_date?: string;
}

export const repairApi = {
    /** Get all repairs */
    getAll: () =>
        request<Repair[]>('/get_repairs', { method: 'GET' }),

    /** Add a new repair request */
    add: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_repair', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Add a new repair issue (employee) */
    addIssue: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_repairs', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Update repair status */
    updateStatus: (id: number, payload: Record<string, unknown>) =>
        request<{ message: string }>(`/edit_repair_status/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    /** IT Admin Update Repair Status */
    itadminUpdateRepair: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/itadmin_update_repair', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};

// ─── General Requests (Raise Request) APIs ───────────────────────────────────

export interface GeneralRequest {
    id: number;
    employee_id?: number | string;
    user_id?: number | string;
    requested_by?: number | string;
    employee_name?: string;
    asset_type?: string;
    asset_name?: string;
    department?: string;
    purpose?: string;
    reason?: string;
    required_from?: string;
    urgency?: string;
    manager_approval?: boolean;
    hr_approval?: boolean;
    it_allocation_status?: string;
    status?: string;
    request_id?: number;
    manager_status?: string;
    accounts_status?: string;
    final_status?: string;
    created_at?: string;
}

export const requestApi = {
    /** Get all requests */
    getAll: () =>
        request<GeneralRequest[]>('/manager-approvals', { method: 'GET' }),

    /** Get HR Requests */
    getHrRequests: () =>
        request<GeneralRequest[]>('/get-hr-asset-requests', { method: 'GET' }),

    /** Get Employee specific requests */
    getEmployeeRequests: (userId: number) =>
        request<GeneralRequest[]>(`/employee-asset-requests/${userId}`, { method: 'GET' }),

    /** Create a new request */
    create: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/raise-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Update a request */
    update: (id: number, payload: Record<string, unknown>) =>
        request<{ message: string }>(`/requests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    /** Manager Approval */
    managerApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/manager-approval/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Accounts Approval */
    accountsApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/accounts-approval/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Employee Raise Request */
    createEmployee: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/raise-asset-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** HR Approval */
    hrApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/hr-approve-request/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** HR Asset Request */
    createHrRequest: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/hr-asset-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** HR Initiate Exit Process */
    initiateExitProcess: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/initiate-exit', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};
