/**
 * Centralized API Service
 * All backend API calls go through this module for consistency.
 * Backend base URL is proxied via vite.config.ts → http://127.0.0.1:5002
 */

const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? 'https://assetbackend-sag7.onrender.com' : '/api');

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
    product_name?: string;
    productName?: string;
    ProductName?: string;
    Product_name?: string;
    assigner_name?: string;
    name?: string;
    asset_name?: string;
    assetName?: string;
    AssetName?: string;
    Asset_name?: string;
    category?: string;
    status: string;
    approval_status?: string;
    company?: string;
    assigner_location?: string;
    assigned_to?: string | null;
    assignedTo?: string | null;
    employee_name?: string;
    whatsapp_number?: string;
    employment_type?: string;
    employee_role?: string;
    employeeRole?: string;
    employee_location?: string;
    ownership?: string;
    vendor_name?: string;
    vendor?: string;
    amount?: number;
    serial_number?: string;
    serialnumber: string;
    purchase_date?: string;
    condition?: string;
    warranty_period?: string;
    created_by?: string;
    laptop_model_number?: string;
    laptop_specifications?: string;
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

    /** Delete a tangible product */
    delete: (id: number) =>
        request<{ message: string; product_id: number }>(`/products/delete/${id}`, {
            method: 'POST',
        }),

    // Legacy tangible actions kept for reference only:
    // assignEmployee: (productId: number, payload: { user_id: string | number; location: string }) =>
    //     request<{ message: string }>(`/assign_employee/${productId}`, {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
    // getReportSummary: () =>
    //     request<unknown>('/reports/product_summary', { method: 'GET' }),
    // verifyReturn: (productId: number) =>
    //     request<{ message: string }>(`/employee-return-asset/${productId}`, {
    //         method: 'POST',
    //     }),
    // itadminVerifyReturn: (productId: number) =>
    //     request<{ message: string }>(`/verify-return/${productId}`, {
    //         method: 'POST',
    //     }),
    itadminVerifyReturn: (productId: number) =>
        request<{ message: string }>(`/verify-return/${productId}`, {
            method: 'POST',
        }),
    // markAssetObsolete: (productId: number) =>
    //     request<{ message: string }>(`/mark-asset-obsolete/${productId}`, {
    //         method: 'POST',
    //     }),
    // hmDisposeAsset: (productId: number) =>
    //     request<{ message: string }>(`/management-approve-disposal/${productId}`, {
    //         method: 'POST',
    //     }),
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
    Subscription_type?: string;
    subscription_renewal_date?: string;
    Subscription_renewal_date?: string;
    category?: string;
    assigner_location?: string;
    employee_name?: string;
    whatsapp_number?: string;
    employment_type?: string;
    role?: string;
    employee_role?: string;
    employeeRole?: string;
    employee_location?: string;
    amount_currency?: string;
    amountCurrency?: string;
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

    // Legacy intangible actions kept for reference only:
    // assignToEmployee: (employeeId: number, payload: { asset_id: number; assigned_to: string; location?: string }) =>
    //     request<{ message: string }>(`/assign-intangible-assets/${employeeId}`, {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
    // getReportSummary: () =>
    //     request<unknown>('/reports/intangible_summary', { method: 'GET' }),
    // getIntangibleForApproval: () =>
    //     request<IntangibleAsset[]>('/get-intangible-assets', { method: 'GET' }),
    // updateApprovalStatus: (id: number, payload: { approval_status: string }) =>
    //     request<{ message: string }>(`/intangible-assets/${id}`, {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
};

// ─── Employee APIs ──────────────────────────────────────────────────────────

export interface RenewalNotification {
    id?: number | string;
    asset_id?: number | string;
    title?: string;
    message?: string;
    asset_name?: string;
    name?: string;
    category?: string;
    renewal_date?: string;
    days_before?: number;
    daysBefore?: number;
    created_at?: string;
}

export const notificationApi = {
    getRenewalNotifications: () =>
        request<{ notifications?: RenewalNotification[] } | RenewalNotification[]>('/renewal-notifications', { method: 'GET' }),
};

export interface Employee {
    id: number;
    name: string;
    email?: string;
    username?: string;
    department?: string;
    whatsapp_number?: string;
    whatsappNumber?: string;
    alternate_number?: string;
    alternateNumber?: string;
    employment_type?: string;
    employmentType?: string;
    role?: string;
    employee_role?: string;
    employeeRole?: string;
    location?: string;
}

export const employeeApi = {
    /** Get all employees */
    getAll: () =>
        request<Employee[]>('/employees', { method: 'GET' }),

    add: (payload: {
        name: string;
        whatsappNumber: string;
        whatsapp_number?: string;
        employmentType: string;
        role: string;
        location: string;
    }) =>
        request<{ message: string; id: number }>('/add_employee', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    update: (id: string | number, payload: {
        name: string;
        email?: string;
        whatsappNumber: string;
        whatsapp_number?: string;
        alternateNumber?: string;
        employmentType: string;
        role: string;
        location: string;
    }) =>
        request<{ message: string }>(`/employees/update/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    // Legacy employee helpers kept for reference only:
    // getEmployeeAssets: (employeeId: number) =>
    //     request<{ products: Product[]; intangible_assets: IntangibleAsset[] }>(
    //         `/api/assets/${employeeId}`,
    //         { method: 'GET' }
    //     ),
    // getEmployeeIntangibleAssets: (employeeId: number) =>
    //     request<IntangibleAsset[]>(`/intangible-assets/${employeeId}`, {
    //         method: 'GET',
    //     }),
    // initiateExit: (payload: { user_id: number }) =>
    //     request<{ message: string }>('/initiate-exit', {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
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

/* Legacy request/approval flow kept for reference only.
export const assetRequestApi = {
    getAll: () =>
        request<AssetRequest[]>('/assets', { method: 'GET' }),

    submitRequest: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/assets/request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    makeDecision: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/assets/decision/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};
*/

// ─── Additional Asset APIs ──────────────────────────────────────────────────

/* Legacy additional-asset flow kept for reference only.
export const additionalAssetApi = {
    addTangible: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_additional_asset', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    addIntangible: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/additional_intangible_asset', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};
*/

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
    /** Add a new repair issue (employee) */
    addIssue: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/add_repairs', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    getAll: () =>
        request<{ repairs: Repair[] }>('/get_repairs', { method: 'GET' }),

    // Legacy repair admin/query helpers kept for reference only:
    // add: (payload: Record<string, unknown>) =>
    //     request<{ message: string }>('/add_repair', {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
    // updateStatus: (id: number, payload: Record<string, unknown>) =>
    //     request<{ message: string }>(`/edit_repair_status/${id}`, {
    //         method: 'PUT',
    //         body: JSON.stringify(payload),
    //     }),
    // itadminUpdateRepair: (payload: Record<string, unknown>) =>
    //     request<{ message: string }>('/itadmin_update_repair', {
    //         method: 'POST',
    //         body: JSON.stringify(payload),
    //     }),
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

/* Legacy request workflow kept for reference only.
export const requestApi = {
    getAll: () =>
        request<GeneralRequest[]>('/manager-approvals', { method: 'GET' }),

    getHrRequests: () =>
        request<GeneralRequest[]>('/get-hr-asset-requests', { method: 'GET' }),

    getEmployeeRequests: (userId: number) =>
        request<GeneralRequest[]>(`/employee-asset-requests/${userId}`, { method: 'GET' }),

    create: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/raise-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    update: (id: number, payload: Record<string, unknown>) =>
        request<{ message: string }>(`/requests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    managerApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/manager-approval/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    accountsApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/accounts-approval/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    createEmployee: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/raise-asset-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    hrApprove: (id: number, payload: { status: string }) =>
        request<{ message: string }>(`/hr-approve-request/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    createHrRequest: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/hr-asset-request', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    initiateExitProcess: (payload: Record<string, unknown>) =>
        request<{ message: string }>('/initiate-exit', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};
*/
