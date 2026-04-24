import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadges';
import { CircleEllipsis, Loader2, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types';

const TANGIBLE_CATEGORIES = ['Laptop', 'Desktop', 'Mouse', 'Headset'] as const;
const ASSIGNER_LOCATIONS = ['Banglore', 'Hyderabad', 'Vijayawada'] as const;
type TangibleFilterKey =
  | 'assignerName'
  | 'category'
  | 'assetName'
  | 'status'
  | 'assignerLocation'
  | 'employeeName'
  | 'ownership'
  | 'vendorName'
  | 'amount'
  | 'serialNumber'
  | 'modelNumber'
  | 'specifications';

const TANGIBLE_FILTER_KEYS: TangibleFilterKey[] = [
  'assignerName',
  'category',
  'assetName',
  'status',
  'assignerLocation',
  'employeeName',
  'ownership',
  'vendorName',
  'amount',
  'serialNumber',
  'modelNumber',
  'specifications',
];

const getOwnershipLabel = (asset: Asset) => (asset.vendor ? 'Vendor Asset' : 'Company-Owned');

const tangibleFilterAccessors: Record<TangibleFilterKey, (asset: Asset) => string> = {
  assignerName: (asset) => asset.assignerName || '—',
  category: (asset) => asset.category || '—',
  assetName: (asset) => asset.assetName || '—',
  status: (asset) => asset.status || '—',
  assignerLocation: (asset) => asset.assignerLocation || '—',
  employeeName: (asset) => asset.employeeName || asset.assignedTo || '—',
  ownership: (asset) => getOwnershipLabel(asset),
  vendorName: (asset) => asset.vendorName || asset.vendor || '—',
  amount: (asset) => (asset.amount != null ? String(asset.amount) : '—'),
  serialNumber: (asset) => asset.serialNumber || '—',
  modelNumber: (asset) => asset.laptopModelNumber || '—',
  specifications: (asset) => asset.laptopSpecifications || '—',
};

function normalizeTangibleCategory(value?: string) {
  return TANGIBLE_CATEGORIES.includes(value as (typeof TANGIBLE_CATEGORIES)[number]) ? value || 'Laptop' : 'Other';
}

function isStandardTangibleCategory(value?: string) {
  return TANGIBLE_CATEGORIES.includes(value as (typeof TANGIBLE_CATEGORIES)[number]);
}

function normalizeAssignerLocation(value?: string) {
  return ASSIGNER_LOCATIONS.includes(value as (typeof ASSIGNER_LOCATIONS)[number]) ? value || '' : '';
}

type TangibleFormState = {
  name: string;
  assetName: string;
  category: string;
  customCategory: string;
  status: 'Available' | 'Assigned';
  ownership: 'Company-Owned' | 'Vendor Asset';
  assignerLocation: string;
  employeeId: string;
  employeeName: string;
  employeeContactNumber: string;
  employmentType: 'Permanent' | 'Contract';
  employeeLocation: string;
  serialNumber: string;
  laptopModelNumber: string;
  laptopSpecifications: string;
  vendorName: string;
  amount: string;
};

const emptyForm = (): TangibleFormState => ({
  name: '',
  assetName: '',
  category: '',
  customCategory: '',
  status: 'Available',
  ownership: 'Company-Owned',
  assignerLocation: '',
  employeeId: '',
  employeeName: '',
  employeeContactNumber: '',
  employmentType: 'Permanent',
  employeeLocation: '',
  serialNumber: '',
  laptopModelNumber: '',
  laptopSpecifications: '',
  vendorName: '',
  amount: '',
});

export default function TangibleAssetManagement() {
  const { user } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset, addIssue, employees, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionMode, setActionMode] = useState<'repair' | 'replacement' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionAsset, setActionAsset] = useState<Asset | null>(null);
  const [employeeInfoAsset, setEmployeeInfoAsset] = useState<Asset | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<TangibleFilterKey, string[]>>({
    assignerName: [],
    category: [],
    assetName: [],
    status: [],
    assignerLocation: [],
    employeeName: [],
    ownership: [],
    vendorName: [],
    amount: [],
    serialNumber: [],
    modelNumber: [],
    specifications: [],
  });
  const [form, setForm] = useState<TangibleFormState>(emptyForm());
  const employeeDetailsDisabled = form.status === 'Available';
  const tangibleAssets = assets.filter((asset) => asset.type === 'Tangible');
  const employeeOptions = employees;
  const columnFilterOptions = useMemo(
    () =>
      TANGIBLE_FILTER_KEYS.reduce(
        (acc, key) => {
          acc[key] = getUniqueValues(tangibleAssets, tangibleFilterAccessors[key]);
          return acc;
        },
        {} as Record<TangibleFilterKey, string[]>,
      ),
    [tangibleAssets],
  );

  const filteredAssets = tangibleAssets.filter((asset) => {
    const matchesSearch =
      (asset.assignerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.assetName || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.vendorName || asset.vendor || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesColumnFilters = TANGIBLE_FILTER_KEYS.every((key) => {
      const selectedValues = columnFilters[key];
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(tangibleFilterAccessors[key](asset));
    });
    return matchesSearch && matchesStatus && matchesColumnFilters;
  });
  const totalAssetsCount = tangibleAssets.length;
  const filteredAssetsCount = filteredAssets.length;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    const matchedEmployee = employees.find((employee) => employee.name === (asset.employeeName || asset.assignedTo || ''));

    setEditingId(asset.id);
    setForm({
      name: asset.assignerName || '',
      assetName: asset.name || asset.assetName || '',
      category: normalizeTangibleCategory(asset.category),
      customCategory: isStandardTangibleCategory(asset.category) ? '' : asset.category || '',
      status: (asset.status === 'Assigned' ? 'Assigned' : 'Available') as 'Available' | 'Assigned',
      ownership: (asset.ownership || (asset.vendorName || asset.vendor ? 'Vendor Asset' : 'Company-Owned')) as 'Company-Owned' | 'Vendor Asset',
      assignerLocation: normalizeAssignerLocation(asset.assignerLocation),
      employeeId: matchedEmployee?.id || '',
      employeeName: asset.employeeName || asset.assignedTo || '',
      employeeContactNumber: matchedEmployee?.phoneNumber || asset.employeeContactNumber || '',
      employmentType: (asset.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract',
      employeeLocation: asset.employeeLocation || '',
      serialNumber: asset.serialNumber || '',
      laptopModelNumber: asset.laptopModelNumber || '',
      laptopSpecifications: asset.laptopSpecifications || '',
      vendorName: asset.vendorName || asset.vendor || '',
      amount: asset.amount != null ? String(asset.amount) : '',
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

    if (!form.name || !form.assetName || !resolvedCategory || !form.serialNumber) {
      toast({
        title: 'Missing fields',
        description: 'Please enter assigner name, category, asset name, and serial number.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        assignerName: form.name,
        assetName: form.assetName,
        type: 'Tangible' as const,
        category: resolvedCategory,
        status: form.status,
        assignedTo: form.status === 'Assigned' && form.employeeId ? form.employeeId : undefined,
        assignerLocation: form.assignerLocation,
        ownership: form.ownership,
        employeeName: form.employeeName,
        employeeContactNumber: form.employeeContactNumber,
        employmentType: form.employmentType,
        employeeLocation: form.employeeLocation,
        serialNumber: form.serialNumber,
        laptopModelNumber: form.laptopModelNumber,
        laptopSpecifications: form.laptopSpecifications,
        amount: form.amount ? Number(form.amount) : 0,
        vendorName: form.ownership === 'Vendor Asset' ? form.vendorName : '',
      };

      if (editingId) {
        await updateAsset(editingId, payload);
        toast({ title: 'Tangible asset updated' });
      } else {
        await addAsset(payload);
        toast({ title: 'Tangible asset added' });
      }
      resetAndClose();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save tangible asset.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAsset(id);
      toast({ title: 'Tangible asset removed' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete tangible asset.',
        variant: 'destructive',
      });
    }
  };

  const openActionDialog = (asset: Asset, mode: 'repair' | 'replacement') => {
    setActionAsset(asset);
    setActionMode(mode);
    setActionReason('');
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setActionMode(null);
    setActionReason('');
    setActionAsset(null);
  };

  const closeEmployeeInfoDialog = () => {
    setEmployeeInfoAsset(null);
  };

  const submitAssetAction = async () => {
    if (!actionAsset || !actionMode) return;

    const trimmedReason = actionReason.trim();
    if (!trimmedReason) {
      toast({
        title: 'Reason required',
        description: 'Please enter a reason before continuing.',
        variant: 'destructive',
      });
      return;
    }

    const nextStatus = actionMode === 'repair' ? 'Repair' : 'Replacement';
    await updateAsset(actionAsset.id, {
      status: nextStatus,
      condition: trimmedReason,
    });

    await addIssue({
      assetId: actionAsset.id,
      raisedBy: user?.id || 'higher_management',
      description:
        actionMode === 'repair'
          ? `Repair requested for ${actionAsset.name}: ${trimmedReason}`
          : `Replacement requested for ${actionAsset.name}: ${trimmedReason}`,
      priority: 'High',
    });

    toast({
      title: actionMode === 'repair' ? 'Repair request raised' : 'Replacement request raised',
    });
    closeActionDialog();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading tangible assets...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tangible Asset Management</h1>
          {/* <p className="text-sm text-muted-foreground">
            Manage laptops and other physical assets with assignment and device details.
          </p> */}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-100">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assigner name, asset name, serial number, vendor, or location"
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
          <Button onClick={openAdd} className="h-11 w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Tangible Asset
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-md border bg-slate-50 px-3 py-1 font-medium text-slate-700">
          Total: {totalAssetsCount}
        </span>
        <span className="rounded-md border bg-blue-50 px-3 py-1 font-medium text-blue-700">
          Filtered: {filteredAssetsCount}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="max-h-[calc(100vh-14rem)] overflow-x-auto overflow-y-auto scrollbar-thin">
          <table className="min-w-[1680px] w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[#0b2a59] text-white">
              <tr>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Assigner Name"
                    options={columnFilterOptions.assignerName}
                    selected={columnFilters.assignerName}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, assignerName: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Category"
                    options={columnFilterOptions.category}
                    selected={columnFilters.category}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, category: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Asset Name"
                    options={columnFilterOptions.assetName}
                    selected={columnFilters.assetName}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, assetName: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Asset Status"
                    options={columnFilterOptions.status}
                    selected={columnFilters.status}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, status: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Assigner Location"
                    options={columnFilterOptions.assignerLocation}
                    selected={columnFilters.assignerLocation}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, assignerLocation: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Emp Name"
                    options={columnFilterOptions.employeeName}
                    selected={columnFilters.employeeName}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, employeeName: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Ownership"
                    options={columnFilterOptions.ownership}
                    selected={columnFilters.ownership}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, ownership: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Vendor Name"
                    options={columnFilterOptions.vendorName}
                    selected={columnFilters.vendorName}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, vendorName: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Amount"
                    options={columnFilterOptions.amount}
                    selected={columnFilters.amount}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, amount: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Serial No."
                    options={columnFilterOptions.serialNumber}
                    selected={columnFilters.serialNumber}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, serialNumber: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Model No."
                    options={columnFilterOptions.modelNumber}
                    selected={columnFilters.modelNumber}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, modelNumber: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Specifications"
                    options={columnFilterOptions.specifications}
                    selected={columnFilters.specifications}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, specifications: selected }))}
                    dark
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No tangible assets found.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-t">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{asset.assignerName || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">{asset.category || '-'}</td>
                    <td className="px-4 py-4">{asset.assetName || '—'}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-4 py-4">{asset.assignerLocation || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span>{asset.employeeName || asset.assignedTo || '—'}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none border-0 p-0 shadow-none hover:bg-transparent focus-visible:ring-0"
                          onClick={() => setEmployeeInfoAsset(asset)}
                          aria-label={`View employee info for ${asset.employeeName || asset.assignedTo || 'this asset'}`}
                        >
                          <CircleEllipsis className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-4">{asset.vendor ? 'Vendor Asset' : 'Company-Owned'}</td>
                    <td className="px-4 py-4">{asset.vendorName || asset.vendor || '—'}</td>
                    <td className="px-4 py-4">{asset.amount != null ? asset.amount : '—'}</td>
                    <td className="px-4 py-4">{asset.serialNumber || '—'}</td>
                    <td className="px-4 py-4">{asset.laptopModelNumber || '—'}</td>
                    <td className="px-4 py-4">{asset.laptopSpecifications || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-right justify-left">
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
                            <DropdownMenuItem onClick={() => openActionDialog(asset, 'repair')}>
                              <Wrench className="mr-2 h-4 w-4" />
                              Repair
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openActionDialog(asset, 'replacement')}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Replacement
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => void handleDelete(asset.id)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Tangible Asset' : 'Add Tangible Asset'}</DialogTitle>
            <DialogDescription>
              Fill in the physical asset details required for tangible asset management.
            </DialogDescription>
          </DialogHeader>

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
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TANGIBLE_CATEGORIES.map((category) => (
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
            <div className="space-y-1">
              <Label>Asset Name</Label>
              <Input value={form.assetName} onChange={(e) => setForm((prev) => ({ ...prev, assetName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Asset Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as 'Available' | 'Assigned' }))}>
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
                    const selectedEmployee = employeeOptions.find((employee) => employee.id === value);

                    setForm((prev) => ({
                      ...prev,
                      employeeId: value,
                      employeeName: selectedEmployee?.name || '',
                      employeeContactNumber: selectedEmployee?.phoneNumber || '',
                    }));
                  }}
                  disabled={employeeDetailsDisabled}
                >
                  <SelectTrigger disabled={employeeDetailsDisabled}>
                    <SelectValue placeholder={employeeOptions.length ? 'Select employee' : 'No employees available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeOptions.map((employee) => (
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
                  value={form.employmentType}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, employmentType: value as 'Permanent' | 'Contract' }))}
                >
                  <SelectTrigger disabled={employeeDetailsDisabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
            </div>
              <div className="space-y-2">
                <Label>Employee Location</Label>
                <Select
                  value={form.employeeLocation}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, employeeLocation: value }))}
                >
                  <SelectTrigger disabled={employeeDetailsDisabled}>
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
                <Label>Ownership</Label>
                <Select
                  value={form.ownership}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      ownership: value as 'Company-Owned' | 'Vendor Asset',
                      vendorName: value === 'Company-Owned' ? '' : prev.vendorName,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company-Owned">Company-Owned</SelectItem>
                    <SelectItem value="Vendor Asset">Vendor Asset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={form.vendorName}
                  onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))}
                  disabled={form.ownership === 'Company-Owned'}
                  placeholder={form.ownership === 'Company-Owned' ? 'Not required for company-owned assets' : 'Enter vendor name'}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={form.serialNumber} onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))} />
              </div>
            <div className="space-y-2">
              <Label>Model Number</Label>
              <Input value={form.laptopModelNumber} onChange={(e) => setForm((prev) => ({ ...prev, laptopModelNumber: e.target.value }))} />
            </div>
              <div className="space-y-2">
                <Label>Specifications</Label>
                <Textarea
                  value={form.laptopSpecifications}
                  onChange={(e) => setForm((prev) => ({ ...prev, laptopSpecifications: e.target.value }))}
                  rows={1}
                  className="min-h-11 resize-none"
                />
              </div>
            </div>

          <DialogFooter>
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

      <Dialog open={Boolean(employeeInfoAsset)} onOpenChange={(open) => (open ? undefined : closeEmployeeInfoDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Info</DialogTitle>
            <DialogDescription>
              Additional employee details for the selected tangible asset.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Emp Contact No</Label>
              <p className="text-sm text-slate-700">{employeeInfoAsset?.employeeContactNumber || '—'}</p>
            </div>
            <div className="space-y-1">
              <Label>Employment Type</Label>
              <p className="text-sm text-slate-700">{employeeInfoAsset?.employmentType || '—'}</p>
            </div>
            <div className="space-y-1">
              <Label>Emp Location</Label>
              <p className="text-sm text-slate-700">{employeeInfoAsset?.employeeLocation || '—'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEmployeeInfoDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialogOpen} onOpenChange={(open) => (open ? setActionDialogOpen(true) : closeActionDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionMode === 'repair' ? 'Add Repair Reason' : 'Add Replacement Reason'}
            </DialogTitle>
            <DialogDescription>
              {actionMode === 'repair'
                ? 'Tell us why this asset needs repair.'
                : 'Tell us why this asset needs replacement.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="asset-action-reason">Reason</Label>
            <Textarea
              id="asset-action-reason"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={4}
              placeholder="Enter the reason"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button onClick={() => void submitAssetAction()}>
              {actionMode === 'repair' ? 'Submit Repair' : 'Submit Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

