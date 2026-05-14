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
import { Textarea } from '@/components/ui/textarea';
import { ToastAction } from '@/components/ui/toast';
import { StatusBadge } from '@/components/StatusBadges';
import { CircleEllipsis, Download, History, ImagePlus, Loader2, Mail, MessageCircle, MoreVertical, Pencil, Plus, RefreshCw, Search, Share2, Trash2, Wrench, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mailApi } from '@/services/api';
import { createTableImageFile, exportCsv, type CsvColumn } from '@/lib/exportCsv';
import { Asset } from '@/types';

const TANGIBLE_CATEGORIES = ['Laptop', 'Desktop', 'Mouse', 'Headset'] as const;
const ASSIGNER_LOCATIONS = ['Banglore', 'Hyderabad', 'Vijayawada'] as const;
const DEFAULT_WHATSAPP_COUNTRY_CODE = '91';
const REPAIR_HISTORY_STORAGE_KEY = 'src_23rasset_tangible_repair_history';
type CurrencyCode = 'USD' | 'INR';
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

const getOwnershipLabel = (asset: Asset) => asset.ownership || (asset.vendor || asset.vendorName ? 'Vendor Asset' : 'Company-Owned');

const tangibleFilterAccessors: Record<TangibleFilterKey, (asset: Asset) => string> = {
  assignerName: (asset) => asset.assignerName || '—',
  category: (asset) => asset.category || '—',
  assetName: (asset) => asset.assetName || '—',
  status: (asset) => asset.status || '—',
  assignerLocation: (asset) => asset.assignerLocation || '—',
  employeeName: (asset) => asset.employeeName || asset.assignedTo || '—',
  ownership: (asset) => getOwnershipLabel(asset),
  vendorName: (asset) => asset.vendorName || asset.vendor || '—',
  amount: (asset) => formatCurrencyAmount(asset.amount, getAssetAmountCurrency(asset)),
  serialNumber: (asset) => asset.serialNumber || '—',
  modelNumber: (asset) => asset.laptopModelNumber || '—',
  specifications: (asset) => asset.laptopSpecifications || '—',
};

const TANGIBLE_EXPORT_COLUMNS: CsvColumn<Asset>[] = [
  { header: 'Serial No.', value: (asset) => asset.serialNumber },
  { header: 'Name', value: (asset) => asset.assignerName },
  { header: 'Category', value: (asset) => asset.category },
  { header: 'Asset Name', value: (asset) => asset.assetName || asset.name },
  { header: 'Asset Status', value: (asset) => asset.status },
  { header: 'Assigner Location', value: (asset) => asset.assignerLocation },
  { header: 'Employee Name', value: (asset) => asset.employeeName || asset.assignedTo },
  { header: 'WhatsApp No', value: (asset) => asset.employeeWhatsappNumber },
  { header: 'Employment Type', value: (asset) => asset.employmentType },
  { header: 'Role', value: (asset) => asset.employeeRole },
  { header: 'Employee Location', value: (asset) => asset.employeeLocation },
  { header: 'Ownership', value: (asset) => getOwnershipLabel(asset) },
  { header: 'Vendor Name', value: (asset) => asset.vendorName || asset.vendor },
  { header: 'Amount (USD or INR)', value: (asset) => formatCurrencyAmount(asset.amount, getAssetAmountCurrency(asset)) },
  { header: 'Model No.', value: (asset) => asset.laptopModelNumber },
  { header: 'Specifications', value: (asset) => asset.laptopSpecifications },
];

function getAssetAmountCurrency(asset: Asset): CurrencyCode {
  return asset.amountCurrency === 'USD' || asset.amountCurrency === 'INR' ? asset.amountCurrency : 'INR';
}

function formatCurrencyAmount(amount: number | undefined, currency: CurrencyCode) {
  if (amount == null || amount <= 0) return '—';

  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
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

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function loadRepairHistory(): RepairHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(REPAIR_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) as RepairHistoryEntry[] : [];
  } catch {
    return [];
  }
}

function persistRepairHistory(entries: RepairHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REPAIR_HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

function normalizeTangibleCategory(value?: string) {
  return TANGIBLE_CATEGORIES.includes(value as (typeof TANGIBLE_CATEGORIES)[number]) ? value || 'Laptop' : 'Other';
}

function isStandardTangibleCategory(value?: string) {
  return TANGIBLE_CATEGORIES.includes(value as (typeof TANGIBLE_CATEGORIES)[number]);
}

function normalizeAssignerLocation(value?: string) {
  return ASSIGNER_LOCATIONS.includes(value as (typeof ASSIGNER_LOCATIONS)[number]) ? value || '' : '';
}

function getWhatsAppChatUrl(phoneNumber?: string) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) return null;

  const whatsappNumber = digits.length === 10 ? `${DEFAULT_WHATSAPP_COUNTRY_CODE}${digits}` : digits;
  return `https://wa.me/${whatsappNumber}`;
}

function generateTangibleSerialNumber(assets: Asset[], excludeId?: string) {
  const existingSerials = new Set(
    assets
      .filter((asset) => asset.id !== excludeId)
      .map((asset) => asset.serialNumber?.trim().toUpperCase())
      .filter(Boolean),
  );
  const maxAutoSerial = assets.reduce((max, asset) => {
    if (asset.id === excludeId) return max;

    const match = asset.serialNumber?.trim().match(/^TAN-(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  let nextNumber = Math.max(maxAutoSerial, assets.filter((asset) => asset.id !== excludeId).length) + 1;
  let serialNumber = `TAN-${String(nextNumber).padStart(4, '0')}`;

  while (existingSerials.has(serialNumber)) {
    nextNumber += 1;
    serialNumber = `TAN-${String(nextNumber).padStart(4, '0')}`;
  }

  return serialNumber;
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
  employeeWhatsappNumber: string;
  employeeEmail: string;
  employmentType: '' | 'Permanent' | 'Contract';
  employeeRole: string;
  employeeLocation: string;
  serialNumber: string;
  laptopModelNumber: string;
  laptopSpecifications: string;
  vendorName: string;
  amountCurrency: CurrencyCode;
  amount: string;
};

type DeleteConfirmState =
  | { type: 'single'; asset: Asset }
  | { type: 'bulk' }
  | null;

type RepairHistoryEntry = {
  id: string;
  assetId: string;
  repairDate: string;
  repairReason: string;
  repairImageName?: string;
  repairImageDataUrl?: string;
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
  employeeWhatsappNumber: '',
  employeeEmail: '',
  employmentType: '',
  employeeRole: '',
  employeeLocation: '',
  serialNumber: '',
  laptopModelNumber: '',
  laptopSpecifications: '',
  vendorName: '',
  amountCurrency: 'INR',
  amount: '',
});

export default function TangibleAssetManagement() {
  const { user } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset, restoreDeletedAsset, addIssue, employees, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [actionMode, setActionMode] = useState<'repair' | 'replacement' | null>(null);
  const [actionDate, setActionDate] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionImageFile, setActionImageFile] = useState<File | null>(null);
  const [actionAsset, setActionAsset] = useState<Asset | null>(null);
  const [repairDetailsAsset, setRepairDetailsAsset] = useState<Asset | null>(null);
  const [repairHistory, setRepairHistory] = useState<RepairHistoryEntry[]>(() => loadRepairHistory());
  const [employeeInfoAsset, setEmployeeInfoAsset] = useState<Asset | null>(null);
  const [emailTemplateOpen, setEmailTemplateOpen] = useState(false);
  const [emailTemplateSubject, setEmailTemplateSubject] = useState('');
  const [emailTemplateBody, setEmailTemplateBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
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
  const getCurrentEmployeeForAsset = (asset?: Asset | null) => {
    if (!asset) return undefined;

    return employees.find(
      (employee) =>
        employee.id === asset.assignedTo ||
        employee.name === (asset.employeeName || asset.assignedTo || ''),
    );
  };
  const getEmployeeWhatsappForAsset = (asset?: Asset | null) =>
    getCurrentEmployeeForAsset(asset)?.whatsappNumber || asset?.employeeWhatsappNumber || '—';
  const getEmployeeEmailForAsset = (asset?: Asset | null) =>
    getCurrentEmployeeForAsset(asset)?.email || asset?.employeeEmail || '—';
  const getEmployeeRoleForAsset = (asset?: Asset | null) =>
    getCurrentEmployeeForAsset(asset)?.role || asset?.employeeRole || '—';
  const getEmploymentTypeForAsset = (asset?: Asset | null) =>
    getCurrentEmployeeForAsset(asset)?.employmentType || asset?.employmentType || '—';
  const getEmployeeLocationForAsset = (asset?: Asset | null) => {
    const currentEmployee = getCurrentEmployeeForAsset(asset);
    return currentEmployee?.location || asset?.employeeLocation || '—';
  };
  const employeeInfoWhatsappNumber = getEmployeeWhatsappForAsset(employeeInfoAsset);
  const employeeInfoWhatsappUrl = getWhatsAppChatUrl(employeeInfoWhatsappNumber);
  const employeeInfoEmail = getEmployeeEmailForAsset(employeeInfoAsset);
  const employeeInfoEmailAvailable = employeeInfoEmail !== '—' && employeeInfoEmail.includes('@');
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
  const repairHistoryRows = repairHistory
    .map((entry) => ({
      entry,
      asset: tangibleAssets.find((asset) => asset.id === entry.assetId),
    }))
    .filter((row) => Boolean(row.asset));
  const repairDetailsEntry = repairDetailsAsset
    ? repairHistory.find((entry) => entry.assetId === repairDetailsAsset.id)
    : null;
  const isRepairStatus = (status?: string) => {
    const statusKey = (status || '').toUpperCase();
    return statusKey === 'REPAIR' || statusKey === 'UNDER REPAIR';
  };
  const filteredAssetIds = filteredAssets.map((asset) => asset.id);
  const selectedVisibleAssetIds = selectedAssetIds.filter((id) => filteredAssetIds.includes(id));
  const allVisibleSelected = filteredAssetIds.length > 0 && selectedVisibleAssetIds.length === filteredAssetIds.length;
  const someVisibleSelected = selectedVisibleAssetIds.length > 0 && !allVisibleSelected;
  const getAssetDisplayName = (asset: Asset) => asset.assetName || asset.name || 'this tangible asset';

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
    setForm({
      ...emptyForm(),
      serialNumber: generateTangibleSerialNumber(tangibleAssets),
    });
    setDialogOpen(true);
  };

  const handleExport = () => {
    const selectedAssets = selectedAssetIds.length > 0
      ? tangibleAssets.filter((asset) => selectedAssetIds.includes(asset.id))
      : [];
    const assetsToExport = selectedAssets.length > 0 ? selectedAssets : filteredAssets;
    const exportScope = selectedAssets.length > 0 ? 'selected' : 'filtered';

    if (assetsToExport.length === 0) {
      toast({
        title: 'Nothing to export',
        description: selectedAssetIds.length > 0 ? 'Selected tangible assets could not be found.' : 'No tangible assets match the current filters.',
        variant: 'destructive',
      });
      return;
    }

    exportCsv('tangible-assets.csv', assetsToExport, TANGIBLE_EXPORT_COLUMNS);
    toast({
      title: 'Tangible assets exported',
      description: `${assetsToExport.length} ${exportScope} asset${assetsToExport.length === 1 ? '' : 's'} downloaded.`,
    });
  };

  const handleShareAssets = async (asset?: Asset) => {
    const selectedAssets = selectedAssetIds.length > 0
      ? tangibleAssets.filter((item) => selectedAssetIds.includes(item.id))
      : [];
    const assetsToShare = asset ? [asset] : selectedAssets.length > 0 ? selectedAssets : filteredAssets;

    if (assetsToShare.length === 0) {
      toast({
        title: 'Nothing to share',
        description: selectedAssetIds.length > 0 ? 'Selected tangible assets could not be found.' : 'No tangible assets match the current filters.',
        variant: 'destructive',
      });
      return;
    }

    const title = assetsToShare.length === 1 ? getAssetDisplayName(assetsToShare[0]) : 'Tangible assets';
    const file = await createTableImageFile('tangible-assets.png', title, assetsToShare, TANGIBLE_EXPORT_COLUMNS);
    const shareData: ShareData = {
      title,
      text: `${assetsToShare.length} tangible asset${assetsToShare.length === 1 ? '' : 's'} attached as an image.`,
      files: [file],
    };

    try {
      if (typeof navigator === 'undefined' || !navigator.share) {
        toast({
          title: 'Sharing is not supported',
          description: 'This browser cannot share image attachments directly.',
          variant: 'destructive',
        });
        return;
      }

      if (navigator.canShare && !navigator.canShare(shareData)) {
        toast({
          title: 'Image sharing is not supported',
          description: 'This browser cannot share this image attachment directly.',
          variant: 'destructive',
        });
        return;
      }

      await navigator.share(shareData);
      toast({
        title: 'Tangible assets shared',
        description: `${assetsToShare.length} asset${assetsToShare.length === 1 ? '' : 's'} sent as an image.`,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      toast({
        title: 'Share failed',
        description: error instanceof Error ? error.message : 'Unable to share tangible assets as an image.',
        variant: 'destructive',
      });
    }
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
      employeeWhatsappNumber: matchedEmployee?.whatsappNumber || asset.employeeWhatsappNumber || '',
      employeeEmail: matchedEmployee?.email || asset.employeeEmail || '',
      employmentType:
        asset.status === 'Assigned' && asset.employmentType
          ? ((asset.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract')
          : '',
      employeeRole: asset.employeeRole || matchedEmployee?.role || '',
      employeeLocation: matchedEmployee?.location || asset.employeeLocation || '',
      serialNumber: asset.serialNumber || generateTangibleSerialNumber(tangibleAssets, asset.id),
      laptopModelNumber: asset.laptopModelNumber || '',
      laptopSpecifications: asset.laptopSpecifications || '',
      vendorName: asset.vendorName || asset.vendor || '',
      amountCurrency: getAssetAmountCurrency(asset),
      amount: asset.amount != null && asset.amount > 0 ? String(asset.amount) : '',
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
    const serialNumber = form.serialNumber.trim() || generateTangibleSerialNumber(tangibleAssets, editingId || undefined);
    const previousAsset = editingId ? tangibleAssets.find((asset) => asset.id === editingId) : undefined;
    const previousAssignedTo = previousAsset?.assignedTo || previousAsset?.employeeName || '';
    const isAssignedToSelectedEmployee =
      previousAssignedTo === form.employeeId ||
      previousAssignedTo === form.employeeName ||
      previousAsset?.employeeEmail === form.employeeEmail;
    // Assignment mail is disabled for tangible assets.
    const shouldSendAssignmentMail = false;

    if (!form.name.trim() || !form.assetName.trim() || !resolvedCategory) {
      toast({
        title: 'Missing fields',
        description: 'Please enter assigner name, category, and asset name.',
        variant: 'destructive',
      });
      return;
    }

    const duplicateSerialAsset = tangibleAssets.find(
      (asset) => asset.id !== editingId && asset.serialNumber?.trim().toLowerCase() === serialNumber.toLowerCase(),
    );

    if (duplicateSerialAsset) {
      toast({
        title: 'Serial number already exists',
        description: `Serial number "${serialNumber}" is already used by ${duplicateSerialAsset.assetName || duplicateSerialAsset.name || 'another asset'}.`,
        variant: 'destructive',
      });
      return;
    }

    const parsedAmount = form.amount.trim() ? parseCurrencyAmount(form.amount, form.amountCurrency) : 0;

    if (parsedAmount == null) {
      toast({
        title: 'Invalid amount format',
        description:
          form.amountCurrency === 'USD'
            ? 'Use a valid USD amount format.'
            : 'Use a valid INR amount format.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        assignerName: form.name,
        assetName: form.assetName.trim(),
        type: 'Tangible' as const,
        category: resolvedCategory,
        status: form.status,
        assignedTo: form.status === 'Assigned' && form.employeeId ? form.employeeId : undefined,
        assignerLocation: form.assignerLocation,
        ownership: form.ownership,
        employeeName: form.status === 'Assigned' ? form.employeeName : '',
        employeeWhatsappNumber: form.status === 'Assigned' ? form.employeeWhatsappNumber : '',
        employeeEmail: form.status === 'Assigned' ? form.employeeEmail : '',
        employmentType: form.status === 'Assigned' ? form.employmentType : '',
        employeeRole: form.status === 'Assigned' ? form.employeeRole : '',
        employeeLocation: form.status === 'Assigned' ? form.employeeLocation : '',
        serialNumber,
        laptopModelNumber: form.laptopModelNumber,
        laptopSpecifications: form.laptopSpecifications,
        amount: parsedAmount,
        amountCurrency: form.amountCurrency,
        amount_currency: form.amountCurrency,
        vendorName: form.ownership === 'Vendor Asset' ? form.vendorName : '',
      };

      if (editingId) {
        await updateAsset(editingId, payload);
      } else {
        await addAsset(payload);
      }

      let assignmentMailSent = false;
      let assignmentMailFailed = false;

      if (shouldSendAssignmentMail) {
        const assignmentMailSubject = `Asset Assigned - ${form.assetName.trim()}`;
        const assignmentMailBody = `Dear ${form.employeeName || 'Employee'},

The following asset has been assigned to you:

Asset Name: ${form.assetName.trim()}
Category: ${resolvedCategory}

Regards,
Asset Management Team`;

        const mailResult = await mailApi.sendAssetAssignmentMail({
          to: form.employeeEmail.trim(),
          fromUserId: user?.id,
          subject: assignmentMailSubject,
          body: assignmentMailBody,
          assetId: editingId || undefined,
          assetName: form.assetName.trim(),
          employeeName: form.employeeName,
        });

        assignmentMailSent = mailResult.ok;
        assignmentMailFailed = !mailResult.ok;
      }

      if (assignmentMailSent) {
        toast({
          title: editingId ? 'Tangible asset updated' : 'Tangible asset added',
          description: `Assignment email sent to ${form.employeeEmail}.`,
        });
      } else if (assignmentMailFailed) {
        toast({
          title: editingId ? 'Asset updated, email failed' : 'Asset added, email failed',
          description: 'The asset was saved, but the assignment email could not be sent.',
          variant: 'destructive',
        });
      } else {
        toast({ title: editingId ? 'Tangible asset updated' : 'Tangible asset added' });
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

  const undoDeletedAssets = async (deletedAssets: Asset[]) => {
    try {
      for (const asset of deletedAssets) {
        await restoreDeletedAsset(asset);
      }

      toast({
        title: deletedAssets.length === 1 ? 'Tangible asset restored' : 'Tangible assets restored',
        description:
          deletedAssets.length === 1
            ? `${getAssetDisplayName(deletedAssets[0])} is back in the list.`
            : `${deletedAssets.length} tangible assets are back in the list.`,
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
        title: 'Tangible asset removed',
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
        description: error instanceof Error ? error.message : 'Unable to delete tangible asset.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) return;

    const idsToDelete = [...selectedAssetIds];
    const assetsToDelete = tangibleAssets.filter((asset) => idsToDelete.includes(asset.id));
    setSubmitting(true);
    try {
      for (const id of idsToDelete) {
        await deleteAsset(id);
      }
      setSelectedAssetIds([]);
      toast({
        title: 'Tangible assets removed',
        description: `${idsToDelete.length} selected asset${idsToDelete.length === 1 ? '' : 's'} deleted.`,
        action: (
          <ToastAction altText="Undo delete selected tangible assets" onClick={() => void undoDeletedAssets(assetsToDelete)}>
            Undo
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: 'Bulk delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete selected tangible assets.',
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

  const openActionDialog = (asset: Asset, mode: 'repair' | 'replacement') => {
    setActionAsset(asset);
    setActionMode(mode);
    setActionDate(getTodayDateInputValue());
    setActionReason('');
    setActionImageFile(null);
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setActionMode(null);
    setActionDate('');
    setActionReason('');
    setActionImageFile(null);
    setActionAsset(null);
  };

  const handleActionImageChange = (file: File | undefined) => {
    if (!file) {
      setActionImageFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid image',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    setActionImageFile(file);
  };

  const closeEmployeeInfoDialog = () => {
    setEmailTemplateOpen(false);
    setEmailTemplateSubject('');
    setEmailTemplateBody('');
    setEmployeeInfoAsset(null);
  };

  const openEmailTemplateDialog = () => {
    if (emailTemplateOpen) {
      setEmailTemplateOpen(false);
      return;
    }

    setEmailTemplateSubject('');
    setEmailTemplateBody('');
    setEmailTemplateOpen(true);
  };

  const handleEmployeeEmailSend = async () => {
    if (!employeeInfoEmailAvailable || !employeeInfoAsset) return;

    const subject = emailTemplateSubject.trim();
    const body = emailTemplateBody.trim();

    if (!subject || !body) {
      toast({
        title: 'Missing email content',
        description: 'Please enter both subject and message.',
        variant: 'destructive',
      });
      return;
    }

    setEmailSending(true);
    try {
      const result = await mailApi.sendEmployeeMail({
        to: employeeInfoEmail,
        fromUserId: user?.id,
        subject,
        body,
        employeeName: employeeInfoAsset.employeeName || employeeInfoAsset.assignedTo || '',
      });

      if (!result.ok) {
        throw new Error(result.error || 'Email could not be sent.');
      }

      toast({
        title: 'Email sent',
        description: `Email sent to ${employeeInfoEmail}.`,
      });
      setEmailTemplateSubject('');
      setEmailTemplateBody('');
      setEmailTemplateOpen(false);
    } catch (error) {
      toast({
        title: 'Email failed',
        description: error instanceof Error ? error.message : 'Email could not be sent.',
        variant: 'destructive',
      });
    } finally {
      setEmailSending(false);
    }
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

    try {
      const nextStatus = actionMode === 'repair' ? 'Repair' : 'Replacement';
      const repairImageDataUrl = actionMode === 'repair' && actionImageFile ? await readFileAsDataUrl(actionImageFile) : undefined;
      const historyEntry: RepairHistoryEntry | null =
        actionMode === 'repair'
          ? {
              id: `${actionAsset.id}-${Date.now()}`,
              assetId: actionAsset.id,
              repairDate: actionDate,
              repairReason: trimmedReason,
              repairImageName: actionImageFile?.name,
              repairImageDataUrl,
            }
          : null;

      await updateAsset(actionAsset.id, {
        status: nextStatus,
        condition: trimmedReason,
      });

      await addIssue({
        assetId: actionAsset.id,
        raisedBy: user?.id || 'higher_management',
        description:
          actionMode === 'repair'
            ? `Repair requested for ${actionAsset.name} on ${actionDate}: ${trimmedReason}`
            : `Replacement requested for ${actionAsset.name} on ${actionDate}: ${trimmedReason}`,
        repairDate: actionDate,
        repairImageName: actionMode === 'repair' ? actionImageFile?.name : undefined,
        repairImageDataUrl,
        priority: 'High',
      });

      if (historyEntry) {
        setRepairHistory((prev) => {
          const next = [historyEntry, ...prev];
          persistRepairHistory(next);
          return next;
        });
      }

      toast({
        title: actionMode === 'repair' ? 'Repair request raised' : 'Replacement request raised',
      });
      closeActionDialog();
    } catch (error) {
      toast({
        title: actionMode === 'repair' ? 'Repair request failed' : 'Replacement request failed',
        description: error instanceof Error ? error.message : 'Unable to raise this request.',
        variant: 'destructive',
      });
    }
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
        <div className="flex w-full items-start gap-2 md:w-auto">
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
          <div className="flex w-full flex-col gap-2 md:w-auto">
            <Button onClick={openAdd} className="h-11 w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Tangible Asset
            </Button>
            <Button type="button" variant="outline" onClick={() => setHistoryDialogOpen(true)} className="h-10 w-full md:w-auto">
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
          </div>
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
        <Button type="button" variant="outline" size="sm" onClick={() => void handleShareAssets()}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        {selectedAssetIds.length > 0 && (
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
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="max-h-[calc(100vh-14rem)] overflow-x-auto overflow-y-auto scrollbar-thin">
          <table className="min-w-[1740px] w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[9%]" />
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
              <col className="w-[12%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-[#0b2a59] text-white">
              <tr>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                    onCheckedChange={(checked) => toggleAllVisibleAssets(checked === true)}
                    aria-label="Select all visible tangible assets"
                    className="border-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0b2a59]"
                  />
                </th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">Serial No.</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold whitespace-nowrap">
                  <ColumnFilter
                    title="Name"
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
                    title="Amount (USD or INR)"
                    options={columnFilterOptions.amount}
                    selected={columnFilters.amount}
                    onChange={(selected) => setColumnFilters((prev) => ({ ...prev, amount: selected }))}
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
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No tangible assets found.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-t">
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedAssetIds.includes(asset.id)}
                        onCheckedChange={(checked) => toggleAssetSelection(asset.id, checked === true)}
                        aria-label={`Select ${asset.assetName || asset.name || 'asset'}`}
                      />
                    </td>
                    <td className="px-4 py-4">{asset.serialNumber || '—'}</td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{asset.assignerName || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">{asset.category || '-'}</td>
                    <td className="px-4 py-4">{asset.assetName || '—'}</td>
                    <td className="px-4 py-4">
                      {isRepairStatus(asset.status) ? (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer border-0 bg-transparent p-0"
                          onClick={() => setRepairDetailsAsset(asset)}
                          aria-label={`View repair details for ${asset.assetName || asset.name || 'asset'}`}
                        >
                          <StatusBadge status={asset.status} />
                        </button>
                      ) : (
                        <StatusBadge status={asset.status} />
                      )}
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
                    <td className="px-4 py-4">{getOwnershipLabel(asset)}</td>
                    <td className="px-4 py-4">{asset.vendorName || asset.vendor || '—'}</td>
                    <td className="px-4 py-4">{formatCurrencyAmount(asset.amount, getAssetAmountCurrency(asset))}</td>
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
                            <DropdownMenuItem onClick={() => void handleShareAssets(asset)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
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
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">{editingId ? 'Edit Tangible Asset' : 'Add Tangible Asset'}</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              Fill in the physical asset details required for tangible asset management.
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
              <Select
                value={form.status}
                onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as 'Available' | 'Assigned',
                      employeeId: value === 'Assigned' ? prev.employeeId : '',
                      employeeName: value === 'Assigned' ? prev.employeeName : '',
                      employeeWhatsappNumber: value === 'Assigned' ? prev.employeeWhatsappNumber : '',
                      employeeEmail: value === 'Assigned' ? prev.employeeEmail : '',
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
                    const selectedEmployee = employeeOptions.find((employee) => employee.id === value);

                    setForm((prev) => ({
                      ...prev,
                      employeeId: value,
                      employeeName: selectedEmployee?.name || '',
                      employeeWhatsappNumber: selectedEmployee?.whatsappNumber || '',
                      employeeEmail: selectedEmployee?.email || '',
                      employmentType: (selectedEmployee?.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract',
                      employeeRole: selectedEmployee?.role || '',
                      employeeLocation: selectedEmployee?.location || '',
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
                <Label>WhatsApp No</Label>
                <Input
                  value={form.employeeWhatsappNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeWhatsappNumber: e.target.value }))}
                  disabled={employeeDetailsDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Emp Mail</Label>
                <Input
                  type="email"
                  value={form.employeeEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeEmail: e.target.value }))}
                  disabled={employeeDetailsDisabled}
                  placeholder="Employee email"
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
                <Label>Amount (USD or INR)</Label>
                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                  <Select
                    value={form.amountCurrency}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, amountCurrency: value as CurrencyCode }))}
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
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder={
                      form.amountCurrency === 'USD'
                        ? 'Enter amount like 1,200.50'
                        : 'Enter amount like 1,20,000.50'
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={form.serialNumber} readOnly className="bg-slate-50 text-slate-700" />
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

      <Dialog open={Boolean(employeeInfoAsset)} onOpenChange={(open) => (open ? undefined : closeEmployeeInfoDialog())}>
        <DialogContent
          className={`max-h-[88vh] overflow-hidden border-0 p-0 [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white ${
            emailTemplateOpen ? 'sm:max-w-4xl' : 'sm:max-w-md'
          }`}
        >
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">Employee Info</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              Additional employee details for the selected tangible asset.
            </DialogDescription>
          </DialogHeader>

          <div className={`grid gap-6 overflow-y-auto px-6 py-5 ${emailTemplateOpen ? 'md:grid-cols-[0.9fr_1.1fr]' : ''}`}>
            <div className="grid content-start gap-4">
              <div className="space-y-1">
                <Label>WhatsApp No</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-700">{employeeInfoWhatsappNumber}</p>
                  {employeeInfoWhatsappUrl ? (
                    <Button
                      asChild
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#25d366] text-white hover:bg-[#1ebe5d]"
                      aria-label={`Open WhatsApp chat for ${employeeInfoWhatsappNumber}`}
                    >
                      <a href={employeeInfoWhatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Emp Mail</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-700">{employeeInfoEmail}</p>
                  {employeeInfoEmailAvailable ? (
                    <Button
                      type="button"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#0b2a59] text-white hover:bg-[#12386f]"
                      aria-label={`${emailTemplateOpen ? 'Hide' : 'Open'} email template for ${employeeInfoEmail}`}
                      onClick={openEmailTemplateDialog}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <p className="text-sm text-slate-700">{getEmployeeRoleForAsset(employeeInfoAsset)}</p>
              </div>
              <div className="space-y-1">
                <Label>Employment Type</Label>
                <p className="text-sm text-slate-700">{getEmploymentTypeForAsset(employeeInfoAsset)}</p>
              </div>
              <div className="space-y-1">
                <Label>Emp Location</Label>
                <p className="text-sm text-slate-700">{getEmployeeLocationForAsset(employeeInfoAsset)}</p>
              </div>
            </div>

            {emailTemplateOpen ? (
              <div className="grid content-start gap-4 border-t pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                {/* <div>
                  <h3 className="text-base font-semibold text-slate-900">Mail Template</h3>
                  <p className="text-sm text-slate-500">Prepared email content for the selected employee.</p>
                </div>*/}
                <div className="space-y-2">
                  <Label htmlFor="employee-mail-to">To</Label>
                  <Input id="employee-mail-to" value={employeeInfoEmailAvailable ? employeeInfoEmail : ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-mail-subject">Subject</Label>
                  <Input
                    id="employee-mail-subject"
                    value={emailTemplateSubject}
                    onChange={(event) => setEmailTemplateSubject(event.target.value)}
                    placeholder="Enter subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-mail-body">Message</Label>
                  <Textarea
                    id="employee-mail-body"
                    value={emailTemplateBody}
                    onChange={(event) => setEmailTemplateBody(event.target.value)}
                    rows={10}
                    className="resize-none"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            {emailTemplateOpen && employeeInfoEmailAvailable ? (
              <Button
                type="button"
                className="bg-[#0b2a59] text-white hover:bg-[#12386f]"
                onClick={handleEmployeeEmailSend}
                disabled={emailSending}
                aria-label={`Send email to ${employeeInfoEmail}`}
              >
                {emailSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send
              </Button>
            ) : null}
            <Button className="bg-[#0b2a59] text-white hover:bg-[#12386f]" onClick={closeEmployeeInfoDialog} disabled={emailSending}>
              Close
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
                ? `Are you sure you want to delete this tangible asset?`
                : `Are you sure you want to delete ${selectedAssetIds.length} selected tangible asset${
                    selectedAssetIds.length === 1 ? '' : 's'
                  }?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-6 py-5 text-sm text-slate-600">
            {deleteConfirm?.type === 'single' ? (
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Asset Name</span>
                <p className="mt-1 font-semibold text-slate-900">{getAssetDisplayName(deleteConfirm.asset)}</p>
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

      <Dialog open={actionDialogOpen} onOpenChange={(open) => (open ? setActionDialogOpen(true) : closeActionDialog())}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-md [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">
              {actionMode === 'repair' ? 'Add Repair Reason' : 'Add Replacement Reason'}
            </DialogTitle>
            <DialogDescription className="space-y-1 text-sm text-white/80">
              <span className="block font-medium text-white">
                Asset: {actionAsset ? actionAsset.assetName || actionAsset.name || 'Selected asset' : 'Selected asset'}
              </span>
              <span className="block">
              {/*{actionMode === 'repair'
                ? 'Tell us why this asset needs repair.'
                : 'Tell us why this asset needs replacement.'}*/}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="asset-action-date">Date</Label>
              <Input
                id="asset-action-date"
                type="date"
                value={actionDate}
                readOnly
                className="bg-slate-50"
              />
            </div>
            <Label htmlFor="asset-action-reason">Reason</Label>
            <Textarea
              id="asset-action-reason"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={4}
              placeholder="Enter the reason"
            />
            {actionMode === 'repair' ? (
              <div className="space-y-2 pt-2">
                <Label htmlFor="asset-action-image">Upload Image</Label>
                <label
                  htmlFor="asset-action-image"
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition-colors hover:border-[#0b2a59] hover:bg-blue-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ImagePlus className="h-4 w-4 shrink-0 text-[#0b2a59]" />
                    <span className="truncate">{actionImageFile ? actionImageFile.name : 'Choose image from device'}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#0b2a59]">Browse</span>
                </label>
                <Input
                  key={actionImageFile?.name || 'empty-repair-image'}
                  id="asset-action-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleActionImageChange(event.target.files?.[0])}
                />
                {actionImageFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700">{actionImageFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setActionImageFile(null)}
                      aria-label="Remove selected image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button className="bg-[#0b2a59] text-white hover:bg-[#12386f]" onClick={() => void submitAssetAction()}>
              {actionMode === 'repair' ? 'Submit Repair' : 'Submit Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden border-0 p-0 sm:max-w-6xl [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">Repair History</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              View repair issue details submitted from the repair popup.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full text-sm">
                  <thead className="bg-[#0b2a59] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Serial Number</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Asset Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Date of Repair Issue</th>
                      <th className="px-4 py-3 text-left font-semibold">Repair Reason</th>
                      <th className="px-4 py-3 text-left font-semibold">Uploaded Repair Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairHistoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No repair history found.
                        </td>
                      </tr>
                    ) : (
                      repairHistoryRows.map(({ entry, asset }) => (
                        <tr key={entry.id} className="border-t">
                          <td className="px-4 py-4">{asset?.serialNumber || '—'}</td>
                          <td className="px-4 py-4 font-medium text-slate-900">{asset?.assignerName || asset?.name || '—'}</td>
                          <td className="px-4 py-4">{asset?.assetName || asset?.name || '—'}</td>
                          <td className="px-4 py-4">{entry.repairDate || '—'}</td>
                          <td className="px-4 py-4">
                            <p className="max-w-md whitespace-pre-wrap text-slate-700">{entry.repairReason || '—'}</p>
                          </td>
                          <td className="px-4 py-4">
                            {entry.repairImageDataUrl ? (
                              <a href={entry.repairImageDataUrl} target="_blank" rel="noreferrer" className="inline-block">
                                <img
                                  src={entry.repairImageDataUrl}
                                  alt={entry.repairImageName || 'Repair issue'}
                                  className="h-20 w-28 rounded-md border object-cover"
                                />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(repairDetailsAsset)} onOpenChange={(open) => !open && setRepairDetailsAsset(null)}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-lg [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">Repair Details</DialogTitle>
            <DialogDescription className="space-y-1 text-sm text-white/80">
              <span className="block font-medium text-white">
                Asset: {repairDetailsAsset?.assetName || repairDetailsAsset?.name || 'Selected asset'}
              </span>
              <span className="block">Serial Number: {repairDetailsAsset?.serialNumber || '—'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Repair Date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{repairDetailsEntry?.repairDate || '—'}</p>
              </div>
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                <div className="mt-1">{repairDetailsAsset ? <StatusBadge status={repairDetailsAsset.status} /> : '—'}</div>
              </div>
            </div>

            <div className="rounded-md border bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Repair Reason</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{repairDetailsEntry?.repairReason || '—'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Uploaded Repair Image</p>
              {repairDetailsEntry?.repairImageDataUrl ? (
                <a href={repairDetailsEntry.repairImageDataUrl} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={repairDetailsEntry.repairImageDataUrl}
                    alt={repairDetailsEntry.repairImageName || 'Repair issue'}
                    className="max-h-72 w-full rounded-md border object-contain"
                  />
                </a>
              ) : (
                <div className="rounded-md border border-dashed bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                  No repair image uploaded.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={() => setRepairDetailsAsset(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

