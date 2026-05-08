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
import { Download, Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportCsv, type CsvColumn } from '@/lib/exportCsv';
import { Asset } from '@/types';

const ASSIGNER_LOCATIONS = ['Banglore', 'Hyderabad', 'Vijayawada'] as const;
const INTANGIBLE_CATEGORIES = ['Software License', 'Cloud Subscription'] as const;
const INTANGIBLE_AMOUNT_CURRENCY_STORAGE_KEY = 'src_23rasset_intangible_amount_currencies';
type CurrencyCode = 'USD' | 'INR';

function loadAmountCurrencies(): Record<string, CurrencyCode> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(INTANGIBLE_AMOUNT_CURRENCY_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, CurrencyCode>>((acc, [key, value]) => {
      if (value === 'USD' || value === 'INR') acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function persistAmountCurrencies(value: Record<string, CurrencyCode>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INTANGIBLE_AMOUNT_CURRENCY_STORAGE_KEY, JSON.stringify(value));
}

function buildAmountCurrencySignature(input: {
  name?: string;
  category?: string;
  assignerLocation?: string;
  subscriptionType?: string;
  validityStartDate?: string;
  validityEndDate?: string;
  renewalDate?: string;
  amountPaid?: string | number | null;
}) {
  return [
    input.name || '',
    input.category || '',
    input.assignerLocation || '',
    input.subscriptionType || '',
    input.validityStartDate || '',
    input.validityEndDate || '',
    input.renewalDate || '',
    input.amountPaid == null ? '' : String(input.amountPaid),
  ].join('|');
}

function isValidUsdAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/.test(trimmed);
}

function isValidInrAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(\d+|\d{1,3}(,\d{2})*,\d{3})(\.\d{1,2})?$/.test(trimmed);
}

function parseCurrencyAmount(value: string, currency: CurrencyCode) {
  const trimmed = value.trim();
  const isValid = currency === 'USD' ? isValidUsdAmount(trimmed) : isValidInrAmount(trimmed);
  if (!isValid) return null;

  const normalized = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : null;
}

type IntangibleFilterKey =
  | 'name'
  | 'category'
  | 'assignerLocation'
  | 'subscriptionType'
  | 'validityStartDate'
  | 'validityEndDate'
  | 'renewalDate';

const INTANGIBLE_FILTER_KEYS: IntangibleFilterKey[] = [
  'name',
  'category',
  'assignerLocation',
  'subscriptionType',
  'validityStartDate',
  'validityEndDate',
  'renewalDate',
];

function normalizeAssignerLocation(value?: string) {
  return ASSIGNER_LOCATIONS.includes(value as (typeof ASSIGNER_LOCATIONS)[number]) ? value || '' : '';
}

const INTANGIBLE_EXPORT_COLUMNS: CsvColumn<Asset>[] = [
  { header: 'Name', value: (asset) => asset.name },
  { header: 'Category', value: (asset) => asset.category },
  { header: 'Location', value: (asset) => asset.assignerLocation },
  { header: 'Subscription Type', value: (asset) => asset.subscriptionType },
  { header: 'Start Date', value: (asset) => asset.validityStartDate || asset.purchaseDate },
  { header: 'Expiry Date', value: (asset) => asset.validityEndDate || asset.warrantyPeriod },
  { header: 'Renewal Date', value: (asset) => asset.renewalDate },
  { header: 'Amount (USD or INR)', value: (asset) => asset.amountPaid },
];

type IntangibleFormState = {
  name: string;
  category: string;
  customCategory: string;
  status: 'Available' | 'Assigned';
  assignerLocation: string;
  employeeId: string;
  employeeName: string;
  employeeWhatsappNumber: string;
  employmentType: '' | 'Permanent' | 'Contract';
  employeeRole: string;
  employeeLocation: string;
  subscriptionType: string;
  validityStartDate: string;
  validityEndDate: string;
  renewalDate: string;
  amountCurrency: CurrencyCode;
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
  employeeWhatsappNumber: '',
  employmentType: '',
  employeeRole: '',
  employeeLocation: '',
  subscriptionType: '',
  validityStartDate: '',
  validityEndDate: '',
  renewalDate: '',
  amountCurrency: 'INR',
  amountPaid: '',
});

export default function IntangibleAssetManagement() {
  const { user } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset, restoreDeletedAsset, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [columnFilters, setColumnFilters] = useState<Record<IntangibleFilterKey, string[]>>({
    name: [],
    category: [],
    assignerLocation: [],
    subscriptionType: [],
    validityStartDate: [],
    validityEndDate: [],
    renewalDate: [],
  });
  const [form, setForm] = useState<IntangibleFormState>(emptyForm());
  const [amountCurrencies, setAmountCurrencies] = useState<Record<string, CurrencyCode>>(() => loadAmountCurrencies());

  const intangibleAssets = assets.filter((asset) => asset.type === 'Intangible');
  const getAmountCurrency = (asset: Asset): CurrencyCode => {
    const idKey = `id:${asset.id}`;
    const signatureKey = `sig:${buildAmountCurrencySignature({
      name: asset.name,
      category: asset.category,
      assignerLocation: asset.assignerLocation,
      subscriptionType: asset.subscriptionType,
      validityStartDate: asset.validityStartDate || asset.purchaseDate,
      validityEndDate: asset.validityEndDate || asset.warrantyPeriod,
      renewalDate: asset.renewalDate,
      amountPaid: asset.amountPaid,
    })}`;

    const assetCurrency = asset.amountCurrency === 'USD' || asset.amountCurrency === 'INR' ? asset.amountCurrency : null;
    return assetCurrency || amountCurrencies[idKey] || amountCurrencies[signatureKey] || 'INR';
  };
  const formatAmountPaid = (asset: Asset) => {
    if (asset.amountPaid == null) return '—';

    const currency = getAmountCurrency(asset);
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(asset.amountPaid) ? 0 : 2,
    }).format(asset.amountPaid);
  };
  const intangibleFilterAccessors: Record<IntangibleFilterKey, (asset: Asset) => string> = {
    name: (asset) => asset.name || '—',
    category: (asset) => asset.category || '—',
    assignerLocation: (asset) => asset.assignerLocation || '—',
    subscriptionType: (asset) => asset.subscriptionType || '—',
    validityStartDate: (asset) => asset.validityStartDate || asset.purchaseDate || '—',
    validityEndDate: (asset) => asset.validityEndDate || asset.warrantyPeriod || '—',
    renewalDate: (asset) => asset.renewalDate || '—',
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
    [intangibleAssets],
  );

  const filteredAssets = intangibleAssets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.subscriptionType || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.assignerLocation || '').toLowerCase().includes(search.toLowerCase());
    const matchesColumnFilters = INTANGIBLE_FILTER_KEYS.every((key) => {
      const selectedValues = columnFilters[key];
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(intangibleFilterAccessors[key](asset));
    });
    return matchesSearch && matchesColumnFilters;
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
    const idKey = `id:${asset.id}`;
    const signatureKey = `sig:${buildAmountCurrencySignature({
      name: asset.name,
      category: asset.category,
      assignerLocation: asset.assignerLocation,
      subscriptionType: asset.subscriptionType,
      validityStartDate: asset.validityStartDate || asset.purchaseDate,
      validityEndDate: asset.validityEndDate || asset.warrantyPeriod,
      renewalDate: asset.renewalDate,
      amountPaid: asset.amountPaid,
    })}`;
    setEditingId(asset.id);
    setForm({
      name: asset.name || '',
      category: normalizedCategory,
      customCategory: normalizedCategory === 'Other' ? category : '',
      status: (asset.status === 'Assigned' ? 'Assigned' : 'Available') as 'Available' | 'Assigned',
      assignerLocation: normalizeAssignerLocation(asset.assignerLocation),
      employeeId: '',
      employeeName: asset.employeeName || asset.assignedTo || '',
      employeeWhatsappNumber: asset.employeeWhatsappNumber || '',
      employmentType:
        asset.status === 'Assigned' && asset.employmentType
          ? ((asset.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract')
          : '',
      employeeRole: asset.employeeRole || '',
      employeeLocation: asset.employeeLocation || '',
      subscriptionType: asset.subscriptionType || '',
      validityStartDate: asset.validityStartDate || asset.purchaseDate || '',
      validityEndDate: asset.validityEndDate || asset.warrantyPeriod || '',
      renewalDate: asset.renewalDate || '',
      amountCurrency:
        asset.amountCurrency === 'USD' || asset.amountCurrency === 'INR'
          ? asset.amountCurrency
          : amountCurrencies[idKey] || amountCurrencies[signatureKey] || 'INR',
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

    const parsedAmount = parseCurrencyAmount(form.amountPaid, form.amountCurrency);
    if (parsedAmount === null) {
      toast({
        title: 'Invalid amount format',
        description:
          form.amountCurrency === 'USD'
            ? 'Use a valid USD amount format.'
            : 'Use a valid INR amount format.',
        // description:
        //   form.amountCurrency === 'USD'
        //     ? 'Enter the amount in USD format, for example 1,200.50 or 1200.50.'
        //     : 'Enter the amount in INR format, for example 1,20,000.50 or 120000.50.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const signatureKey = `sig:${buildAmountCurrencySignature({
        name: form.name,
        category: resolvedCategory,
        assignerLocation: form.assignerLocation,
        subscriptionType: form.subscriptionType,
        validityStartDate: form.validityStartDate,
        validityEndDate: form.validityEndDate,
        renewalDate: form.renewalDate,
        amountPaid: form.amountPaid,
      })}`;
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
          employeeWhatsappNumber: form.status === 'Assigned' ? form.employeeWhatsappNumber : '',
          employmentType: form.status === 'Assigned' ? form.employmentType : '',
          employeeRole: form.status === 'Assigned' ? form.employeeRole : '',
          employeeLocation: form.status === 'Assigned' ? form.employeeLocation : '',
          subscriptionType: form.subscriptionType,
          validityStartDate: form.validityStartDate,
          validityEndDate: form.validityEndDate,
          renewalDate: form.renewalDate,
        amountPaid: parsedAmount,
        amountCurrency: form.amountCurrency,
        amount_currency: form.amountCurrency,
        vendor: '',
        licenseKey: '',
      };

      if (editingId) {
        const nextAmountCurrencies = {
          ...amountCurrencies,
          [`id:${editingId}`]: form.amountCurrency,
          [signatureKey]: form.amountCurrency,
        };
        setAmountCurrencies(nextAmountCurrencies);
        persistAmountCurrencies(nextAmountCurrencies);
        await updateAsset(editingId, payload);
        toast({ title: 'Intangible asset updated' });
      } else {
        const nextAmountCurrencies = {
          ...amountCurrencies,
          [signatureKey]: form.amountCurrency,
        };
        setAmountCurrencies(nextAmountCurrencies);
        persistAmountCurrencies(nextAmountCurrencies);
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
            placeholder="Search by name, category, subscription, or location"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex w-full gap-2 md:w-auto">
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
          <table className="min-w-[1080px] w-full text-sm">
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
                    title="Name"
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
                    title="Location"
                    options={columnFilterOptions.assignerLocation}
                    selected={columnFilters.assignerLocation}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, assignerLocation: selected }))}
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
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Amount (USD or INR)</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                      <td className="px-4 py-4">{asset.assignerLocation || '—'}</td>
                      <td className="px-4 py-4">{asset.subscriptionType || '—'}</td>
                      <td className="px-4 py-4">{asset.validityStartDate || asset.purchaseDate || '—'}</td>
                      <td className="px-4 py-4">{asset.validityEndDate || asset.warrantyPeriod || '—'}</td>
                      <td className="px-4 py-4">{asset.renewalDate || '—'}</td>
                      <td className="px-4 py-4">{formatAmountPaid(asset)}</td>
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
              <Label>Name</Label>
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
              <Label>Location</Label>
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
                    <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
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
              <Label>Amount (USD or INR)</Label>
              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                <Select
                  value={form.amountCurrency}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, amountCurrency: value as 'USD' | 'INR' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={
                    form.amountCurrency === 'USD'
                      ? 'Enter amount like 1,200.50'
                      : 'Enter amount like 1,20,000.50'
                  }
                  value={form.amountPaid}
                  onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
                />
              </div>
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
