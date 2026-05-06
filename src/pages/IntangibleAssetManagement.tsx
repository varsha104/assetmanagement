import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnFilter, getUniqueValues } from '@/components/ColumnFilter';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToastAction } from '@/components/ui/toast';
import { StatusBadge } from '@/components/StatusBadges';
import { Download, Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportCsv, type CsvColumn } from '@/lib/exportCsv';
import { Asset } from '@/types';

const ASSIGNER_LOCATIONS = ['Banglore', 'Hyderabad', 'Vijayawada'] as const;
const INTANGIBLE_CATEGORIES = ['Software License', 'Cloud Subscription'] as const;
type IntangibleFilterKey =
  | 'name'
  | 'category'
  | 'status'
  | 'assignerLocation'
  | 'employeeName'
  | 'employeeContactNumber'
  | 'employmentType'
  | 'employeeRole'
  | 'employeeLocation'
  | 'subscriptionType'
  | 'validityStartDate'
  | 'validityEndDate'
  | 'renewalDate'
  | 'amountPaid';

const INTANGIBLE_FILTER_KEYS: IntangibleFilterKey[] = [
  'name',
  'category',
  'status',
  'assignerLocation',
  'employeeName',
  'employeeContactNumber',
  'employmentType',
  'employeeRole',
  'employeeLocation',
  'subscriptionType',
  'validityStartDate',
  'validityEndDate',
  'renewalDate',
  'amountPaid',
];

function normalizeAssignerLocation(value?: string) {
  return ASSIGNER_LOCATIONS.includes(value as (typeof ASSIGNER_LOCATIONS)[number]) ? value || '' : '';
}

const INTANGIBLE_EXPORT_COLUMNS: CsvColumn<Asset>[] = [
  { header: 'Assigner Name', value: (asset) => asset.name },
  { header: 'Category', value: (asset) => asset.category },
  { header: 'Status', value: (asset) => asset.status },
  { header: 'Assigner Location', value: (asset) => asset.assignerLocation },
  { header: 'Employee Name', value: (asset) => asset.employeeName || asset.assignedTo },
  { header: 'Employee Contact Number', value: (asset) => asset.employeeContactNumber },
  { header: 'Employment Type', value: (asset) => asset.employmentType },
  { header: 'Role', value: (asset) => asset.employeeRole },
  { header: 'Employee Location', value: (asset) => asset.employeeLocation },
  { header: 'Subscription Type', value: (asset) => asset.subscriptionType },
  { header: 'Start Date', value: (asset) => asset.validityStartDate || asset.purchaseDate },
  { header: 'Expiry Date', value: (asset) => asset.validityEndDate || asset.warrantyPeriod },
  { header: 'Renewal Date', value: (asset) => asset.renewalDate },
  { header: 'Amount Paid', value: (asset) => asset.amountPaid },
];

type IntangibleFormState = {
  name: string;
  category: string;
  customCategory: string;
  status: 'Available' | 'Assigned';
  assignerLocation: string;
  employeeId: string;
  employeeName: string;
  employeeContactNumber: string;
  employmentType: '' | 'Permanent' | 'Contract';
  employeeRole: string;
  employeeLocation: string;
  subscriptionType: string;
  validityStartDate: string;
  validityEndDate: string;
  renewalDate: string;
  amountPaid: string;
};

type DeleteConfirmState =
  | { type: 'single'; asset: Asset }
  | { type: 'bulk' }
  | null;

const emptyForm = (): IntangibleFormState => ({
  name: '',
  category: '',
  customCategory: '',
  status: 'Available',
  assignerLocation: '',
  employeeId: '',
  employeeName: '',
  employeeContactNumber: '',
  employmentType: '',
  employeeRole: '',
  employeeLocation: '',
  subscriptionType: '',
  validityStartDate: '',
  validityEndDate: '',
  renewalDate: '',
  amountPaid: '',
});

export default function IntangibleAssetManagement() {
  const { user } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset, restoreDeletedAsset, employees, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [columnFilters, setColumnFilters] = useState<Record<IntangibleFilterKey, string[]>>({
    name: [],
    category: [],
    status: [],
    assignerLocation: [],
    employeeName: [],
    employeeContactNumber: [],
    employmentType: [],
    employeeRole: [],
    employeeLocation: [],
    subscriptionType: [],
    validityStartDate: [],
    validityEndDate: [],
    renewalDate: [],
    amountPaid: [],
  });
  const [form, setForm] = useState<IntangibleFormState>(emptyForm());
  const employeeDetailsDisabled = form.status === 'Available';

  const intangibleAssets = assets.filter((asset) => asset.type === 'Intangible');
  const getEmployeeForAsset = (asset: Asset) =>
    employees.find((employee) => employee.name === (asset.employeeName || asset.assignedTo || ''));
  const getEmployeeRoleForAsset = (asset: Asset) => asset.employeeRole || getEmployeeForAsset(asset)?.role || '';
  const intangibleFilterAccessors: Record<IntangibleFilterKey, (asset: Asset) => string> = {
    name: (asset) => asset.name || '—',
    category: (asset) => asset.category || '—',
    status: (asset) => asset.status || '—',
    assignerLocation: (asset) => asset.assignerLocation || '—',
    employeeName: (asset) => asset.employeeName || asset.assignedTo || '—',
    employeeContactNumber: (asset) => asset.employeeContactNumber || '—',
    employmentType: (asset) => asset.employmentType || '—',
    employeeRole: (asset) => getEmployeeRoleForAsset(asset) || '—',
    employeeLocation: (asset) => asset.employeeLocation || '—',
    subscriptionType: (asset) => asset.subscriptionType || '—',
    validityStartDate: (asset) => asset.validityStartDate || asset.purchaseDate || '—',
    validityEndDate: (asset) => asset.validityEndDate || asset.warrantyPeriod || '—',
    renewalDate: (asset) => asset.renewalDate || '—',
    amountPaid: (asset) => (asset.amountPaid != null ? String(asset.amountPaid) : '—'),
  };
  const columnFilterOptions = useMemo(
    () =>
      INTANGIBLE_FILTER_KEYS.reduce(
        (acc, key) => {
          acc[key] = getUniqueValues(intangibleAssets, intangibleFilterAccessors[key]);
          return acc;
        },
        {} as Record<IntangibleFilterKey, string[]>,
      ),
    [intangibleAssets, employees],
  );

  const filteredAssets = intangibleAssets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.subscriptionType || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.employeeName || asset.assignedTo || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.assignerLocation || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesColumnFilters = INTANGIBLE_FILTER_KEYS.every((key) => {
      const selectedValues = columnFilters[key];
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(intangibleFilterAccessors[key](asset));
    });
    return matchesSearch && matchesStatus && matchesColumnFilters;
  });
  const filteredAssetIds = filteredAssets.map((asset) => asset.id);
  const totalAssetsCount = intangibleAssets.length;
  const selectedVisibleAssetIds = selectedAssetIds.filter((id) => filteredAssetIds.includes(id));
  const allVisibleSelected = filteredAssetIds.length > 0 && selectedVisibleAssetIds.length === filteredAssetIds.length;
  const someVisibleSelected = selectedVisibleAssetIds.length > 0 && !allVisibleSelected;
  const getAssetDisplayName = (asset: Asset) => asset.name || 'this intangible asset';

  const toggleAssetSelection = (id: string, checked: boolean) => {
    setSelectedAssetIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id)));
  };

  const toggleAllVisibleAssets = (checked: boolean) => {
    setSelectedAssetIds((prev) => {
      const hiddenSelections = prev.filter((id) => !filteredAssetIds.includes(id));
      return checked ? [...hiddenSelections, ...filteredAssetIds] : hiddenSelections;
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleExport = () => {
    if (filteredAssets.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No intangible assets match the current filters.',
        variant: 'destructive',
      });
      return;
    }

    exportCsv('intangible-assets.csv', filteredAssets, INTANGIBLE_EXPORT_COLUMNS);
    toast({
      title: 'Intangible assets exported',
      description: `${filteredAssets.length} filtered asset${filteredAssets.length === 1 ? '' : 's'} downloaded.`,
    });
  };

  const openEdit = (asset: Asset) => {
    const category = asset.category || 'Software License';
    const normalizedCategory = INTANGIBLE_CATEGORIES.includes(category as (typeof INTANGIBLE_CATEGORIES)[number])
      ? category
      : 'Other';
    const matchedEmployee = employees.find((employee) => employee.name === (asset.employeeName || asset.assignedTo || ''));
    setEditingId(asset.id);
    setForm({
      name: asset.name || '',
      category: normalizedCategory,
      customCategory: normalizedCategory === 'Other' ? category : '',
      status: (asset.status === 'Assigned' ? 'Assigned' : 'Available') as 'Available' | 'Assigned',
      assignerLocation: normalizeAssignerLocation(asset.assignerLocation),
      employeeId: matchedEmployee?.id || '',
      employeeName: asset.employeeName || asset.assignedTo || '',
      employeeContactNumber: matchedEmployee?.phoneNumber || asset.employeeContactNumber || '',
      employmentType:
        asset.status === 'Assigned' && asset.employmentType
          ? ((asset.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract')
          : '',
      employeeRole: getEmployeeRoleForAsset(asset),
      employeeLocation: matchedEmployee?.location || asset.employeeLocation || '',
      subscriptionType: asset.subscriptionType || '',
      validityStartDate: asset.validityStartDate || asset.purchaseDate || '',
      validityEndDate: asset.validityEndDate || asset.warrantyPeriod || '',
      renewalDate: asset.renewalDate || '',
      amountPaid: asset.amountPaid != null ? String(asset.amountPaid) : '',
    });
    setDialogOpen(true);
  };

  const resetAndClose = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async () => {
    const resolvedCategory = form.category === 'Other' ? form.customCategory.trim() : form.category;
    if (!form.name || !resolvedCategory || !form.subscriptionType || !form.validityStartDate || !form.validityEndDate) {
      toast({
        title: 'Missing fields',
        description: 'Please enter asset name, category, subscription type, start date, and expiry date.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: 'Intangible' as const,
        category: resolvedCategory,
        purchaseDate: form.validityStartDate,
        warrantyPeriod: form.validityEndDate,
        status: form.status,
        approvalStatus: 'Approved' as const,
        assignedTo: form.status === 'Assigned' && form.employeeName ? form.employeeName : undefined,
        createdBy: user?.id || 'higher_management',
          assignerLocation: form.assignerLocation,
          employeeName: form.status === 'Assigned' ? form.employeeName : '',
          employeeContactNumber: form.status === 'Assigned' ? form.employeeContactNumber : '',
          employmentType: form.status === 'Assigned' ? form.employmentType : '',
          employeeRole: form.status === 'Assigned' ? form.employeeRole : '',
          employeeLocation: form.status === 'Assigned' ? form.employeeLocation : '',
          subscriptionType: form.subscriptionType,
          validityStartDate: form.validityStartDate,
          validityEndDate: form.validityEndDate,
          renewalDate: form.renewalDate,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : 0,
        vendor: '',
        licenseKey: '',
      };

      if (editingId) {
        await updateAsset(editingId, payload);
        toast({ title: 'Intangible asset updated' });
      } else {
        await addAsset(payload);
        toast({ title: 'Intangible asset added' });
      }
      resetAndClose();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save intangible asset.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const undoDeletedAssets = async (deletedAssets: Asset[]) => {
    try {
      for (const asset of deletedAssets) {
        await restoreDeletedAsset(asset);
      }

      toast({
        title: deletedAssets.length === 1 ? 'Intangible asset restored' : 'Intangible assets restored',
        description:
          deletedAssets.length === 1
            ? `${getAssetDisplayName(deletedAssets[0])} is back in the list.`
            : `${deletedAssets.length} intangible assets are back in the list.`,
      });
    } catch (error) {
      toast({
        title: 'Undo failed',
        description: error instanceof Error ? error.message : 'Unable to restore the deleted asset.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (asset: Asset) => {
    try {
      await deleteAsset(asset.id);
      setSelectedAssetIds((prev) => prev.filter((item) => item !== asset.id));
      toast({
        title: 'Intangible asset removed',
        description: `${getAssetDisplayName(asset)} was deleted.`,
        action: (
          <ToastAction altText={`Undo delete ${getAssetDisplayName(asset)}`} onClick={() => void undoDeletedAssets([asset])}>
            Undo
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete intangible asset.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) return;

    const idsToDelete = [...selectedAssetIds];
    const assetsToDelete = intangibleAssets.filter((asset) => idsToDelete.includes(asset.id));
    setSubmitting(true);
    try {
      for (const id of idsToDelete) {
        await deleteAsset(id);
      }
      setSelectedAssetIds([]);
      toast({
        title: 'Intangible assets removed',
        description: `${idsToDelete.length} selected asset${idsToDelete.length === 1 ? '' : 's'} deleted.`,
        action: (
          <ToastAction altText="Undo delete selected intangible assets" onClick={() => void undoDeletedAssets(assetsToDelete)}>
            Undo
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: 'Bulk delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete selected intangible assets.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'single') {
      await handleDelete(deleteConfirm.asset);
    } else {
      await handleBulkDelete();
    }

    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading intangible assets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intangible Asset Management</h1>
          {/* <p className="text-sm text-muted-foreground">
            Manage software licenses, subscriptions, and other digital assets.
          </p> */}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-100">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, subscription, employee, or location"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'Available' | 'Assigned')}>
            <SelectTrigger className="h-11 w-full md:w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAdd} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Intangible Asset
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-md border bg-slate-50 px-3 py-1 font-medium text-slate-700">
          Total: {totalAssetsCount}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        {selectedAssetIds.length > 0 && (
          <>
            <span className="rounded-md border bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Selected: {selectedAssetIds.length}
            </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirm({ type: 'bulk' })}
            disabled={submitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedAssetIds.length})
          </Button>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="max-h-[calc(100vh-14rem)] overflow-x-auto overflow-y-auto scrollbar-thin">
          <table className="min-w-[1660px] w-full text-sm">
            <thead className="sticky top-0 z-20 bg-[#0b2a59] text-white">
              <tr>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={(checked) => toggleAllVisibleAssets(checked === true)}
                    aria-label="Select all visible intangible assets"
                    className="border-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0b2a59]"
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Assigner Name"
                    options={columnFilterOptions.name}
                    selected={columnFilters.name}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, name: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Category"
                    options={columnFilterOptions.category}
                    selected={columnFilters.category}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, category: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Status"
                    options={columnFilterOptions.status}
                    selected={columnFilters.status}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, status: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Assigner Location"
                    options={columnFilterOptions.assignerLocation}
                    selected={columnFilters.assignerLocation}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, assignerLocation: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Emp Name"
                    options={columnFilterOptions.employeeName}
                    selected={columnFilters.employeeName}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employeeName: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Emp Contact No"
                    options={columnFilterOptions.employeeContactNumber}
                    selected={columnFilters.employeeContactNumber}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employeeContactNumber: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Employment Type"
                    options={columnFilterOptions.employmentType}
                    selected={columnFilters.employmentType}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employmentType: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Role"
                    options={columnFilterOptions.employeeRole}
                    selected={columnFilters.employeeRole}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employeeRole: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Emp Location"
                    options={columnFilterOptions.employeeLocation}
                    selected={columnFilters.employeeLocation}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employeeLocation: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Subscription Type"
                    options={columnFilterOptions.subscriptionType}
                    selected={columnFilters.subscriptionType}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, subscriptionType: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Start Date"
                    options={columnFilterOptions.validityStartDate}
                    selected={columnFilters.validityStartDate}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, validityStartDate: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Expiry Date"
                    options={columnFilterOptions.validityEndDate}
                    selected={columnFilters.validityEndDate}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, validityEndDate: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Renewal Date"
                    options={columnFilterOptions.renewalDate}
                    selected={columnFilters.renewalDate}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, renewalDate: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">
                  <ColumnFilter
                    title="Amount Paid"
                    options={columnFilterOptions.amountPaid}
                    selected={columnFilters.amountPaid}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, amountPaid: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No intangible assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-t">
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedAssetIds.includes(asset.id)}
                          onCheckedChange={(checked) => toggleAssetSelection(asset.id, checked === true)}
                          aria-label={`Select ${asset.name || 'asset'}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{asset.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">{asset.category || '—'}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-4">{asset.assignerLocation || '—'}</td>
                      <td className="px-4 py-4">{asset.employeeName || asset.assignedTo || '—'}</td>
                      <td className="px-4 py-4">{asset.employeeContactNumber || '—'}</td>
                      <td className="px-4 py-4">{asset.employmentType || '—'}</td>
                      <td className="px-4 py-4">{getEmployeeRoleForAsset(asset) || '—'}</td>
                      <td className="px-4 py-4">{asset.employeeLocation || '—'}</td>
                      <td className="px-4 py-4">{asset.subscriptionType || '—'}</td>
                      <td className="px-4 py-4">{asset.validityStartDate || asset.purchaseDate || '—'}</td>
                      <td className="px-4 py-4">{asset.validityEndDate || asset.warrantyPeriod || '—'}</td>
                      <td className="px-4 py-4">{asset.renewalDate || '—'}</td>
                      <td className="px-4 py-4">{asset.amountPaid != null ? asset.amountPaid : '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-transparent focus-visible:ring-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openEdit(asset)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirm({ type: 'single', asset })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden border-0 p-0 sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="border-0 bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">{editingId ? 'Edit Intangible Asset' : 'Add Intangible Asset'}</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              Fill in the digital asset details required for intangible asset management.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Assigner Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    category: value,
                    customCategory: value === 'Other' ? prev.customCategory : '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {INTANGIBLE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.category === 'Other' ? (
                <div className="pt-2">
                  <Label className="sr-only">Custom Category</Label>
                  <Input
                    value={form.customCategory}
                    onChange={(e) => setForm((prev) => ({ ...prev, customCategory: e.target.value }))}
                    placeholder="Enter custom category"
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Asset Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as 'Available' | 'Assigned',
                    employeeId: value === 'Assigned' ? prev.employeeId : '',
                    employeeName: value === 'Assigned' ? prev.employeeName : '',
                    employeeContactNumber: value === 'Assigned' ? prev.employeeContactNumber : '',
                    employmentType: value === 'Assigned' ? prev.employmentType : '',
                    employeeRole: value === 'Assigned' ? prev.employeeRole : '',
                    employeeLocation: value === 'Assigned' ? prev.employeeLocation : '',
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigner Location</Label>
              <Select
                value={form.assignerLocation}
                onValueChange={(value) => setForm((prev) => ({ ...prev, assignerLocation: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNER_LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label>Employee Name</Label>
                <Select
                  value={form.employeeId || undefined}
                  onValueChange={(value) => {
                    const selectedEmployee = employees.find((employee) => employee.id === value);

                    setForm((prev) => ({
                      ...prev,
                      employeeId: value,
                      employeeName: selectedEmployee?.name || '',
                      employeeContactNumber: selectedEmployee?.phoneNumber || '',
                      employmentType: (selectedEmployee?.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract',
                      employeeRole: selectedEmployee?.role || '',
                      employeeLocation: selectedEmployee?.location || '',
                    }));
                  }}
                  disabled={employeeDetailsDisabled}
                >
                  <SelectTrigger disabled={employeeDetailsDisabled}>
                    <SelectValue placeholder={employees.length ? 'Select employee' : 'No employees available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Contact Number</Label>
                <Input
                  value={form.employeeContactNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeContactNumber: e.target.value }))}
                  disabled={employeeDetailsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={form.employmentType || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, employmentType: value as 'Permanent' | 'Contract' }))}
                  disabled={employeeDetailsDisabled}
                >
                  <SelectTrigger disabled={employeeDetailsDisabled}>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={form.employeeRole}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeRole: e.target.value }))}
                  disabled={employeeDetailsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Location</Label>
                <Input
                  value={form.employeeLocation}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeLocation: e.target.value }))}
                  disabled={employeeDetailsDisabled}
                />
              </div>
              <div className="space-y-2">
                  <Label>Subscription Type</Label>
                  <Select
                    value={form.subscriptionType}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, subscriptionType: value }))}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.validityStartDate} onChange={(e) => setForm((prev) => ({ ...prev, validityStartDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.validityEndDate} onChange={(e) => setForm((prev) => ({ ...prev, validityEndDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Renewal Date</Label>
              <Input type="date" value={form.renewalDate} onChange={(e) => setForm((prev) => ({ ...prev, renewalDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid</Label>
              <Input
                type="number"
                min="0"
                value={form.amountPaid}
                onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
              />
            </div>
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-slate-50 px-6 py-5">
            <Button variant="outline" onClick={resetAndClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Update Asset' : 'Save Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteConfirm)} onOpenChange={(open) => (!open ? setDeleteConfirm(null) : undefined)}>
        <AlertDialogContent className="border-0 p-0 sm:max-w-md">
          <AlertDialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <AlertDialogTitle className="text-xl text-white">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-white/80">
              {deleteConfirm?.type === 'single'
                ? 'Are you sure you want to delete this intangible asset?'
                : `Are you sure you want to delete ${selectedAssetIds.length} selected intangible asset${
                    selectedAssetIds.length === 1 ? '' : 's'
                  }?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-6 py-5 text-sm text-slate-600">
            {deleteConfirm?.type === 'single' ? (
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</span>
                <p className="mt-1 font-semibold text-slate-900">{deleteConfirm.asset.category || 'Software License'}</p>
              </div>
            ) : null}
            <p>You can restore the deleted asset from the undo option after deleting.</p>
          </div>
          <AlertDialogFooter className="border-t bg-slate-50 px-6 py-4">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
