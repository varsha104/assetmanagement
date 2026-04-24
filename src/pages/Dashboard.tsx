import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { StatusBadge } from '@/components/StatusBadges';
import { Info, Package, Building2, CheckCircle, Clock, Loader2, Wrench, CircleAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Asset } from '@/types';

const CHART_COLORS = ['hsl(217, 91%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];
type AssetListFilter = 'all' | 'company-owned' | 'vendor' | 'available' | 'assigned' | 'dead';
const DEAD_STATUS_KEYS = new Set([
  'DEAD',
  'DAMAGED',
  'FAILED',
  'UNDER_REPAIR',
  'REPAIR',
  'REPLACEMENT',
  'BROKEN',
  'RETIRED',
  'OBSOLETE',
  'DISPOSAL',
  'SCRAPPED',
  'UNUSABLE',
]);
const BENIGN_CONDITIONS = new Set(['NEW', 'GOOD', 'EXCELLENT', 'FAIR', 'AVAILABLE']);

function normalizeStatus(value?: string) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function isDeadAsset(asset: Asset) {
  const statusKey = normalizeStatus(asset.status);
  if (DEAD_STATUS_KEYS.has(statusKey)) return true;

  const reasonText = `${asset.condition || ''} ${asset.warrantyPeriod || ''}`.toLowerCase();
  return /damaged|failed|broken|dead|scrap|obsolete|retired/.test(reasonText);
}

function getDeadReason(asset: Asset) {
  const condition = asset.condition?.trim();
  if (condition && !BENIGN_CONDITIONS.has(condition.toUpperCase())) return condition;

  if (asset.subscriptionType) return asset.subscriptionType;
  if (asset.vendor) return asset.vendor;
  return 'Reason not recorded';
}

export default function Dashboard() {
  const { assets, isLoading } = useData();
  const [assetListOpen, setAssetListOpen] = useState(false);
  const [assetListFilter, setAssetListFilter] = useState<AssetListFilter>('all');
  const [selectedCompanyAsset, setSelectedCompanyAsset] = useState<Asset | null>(null);
  const [companyAssetInfoOpen, setCompanyAssetInfoOpen] = useState(false);
  const [totalAssetsView, setTotalAssetsView] = useState<'Tangible' | 'Intangible'>('Tangible');
  const [availableAssetsView, setAvailableAssetsView] = useState<'Tangible' | 'Intangible'>('Tangible');
  const [assignedAssetsView, setAssignedAssetsView] = useState<'Tangible' | 'Intangible'>('Tangible');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  const totalAssets = assets.length;
  const tangibleAssets = assets.filter((asset) => asset.type === 'Tangible');
  const intangibleAssets = assets.filter((asset) => asset.type === 'Intangible');
  const availableTangibleAssets = tangibleAssets.filter(
    (asset) => normalizeStatus(asset.status) === 'AVAILABLE' && !isDeadAsset(asset),
  );
  const availableIntangibleAssets = intangibleAssets.filter(
    (asset) => normalizeStatus(asset.status) === 'AVAILABLE' && !isDeadAsset(asset),
  );
  const assignedTangibleAssets = tangibleAssets.filter(
    (asset) => (Boolean(asset.assignedTo) || normalizeStatus(asset.status) === 'ASSIGNED') && !isDeadAsset(asset),
  );
  const assignedIntangibleAssets = intangibleAssets.filter(
    (asset) => (Boolean(asset.assignedTo) || normalizeStatus(asset.status) === 'ASSIGNED') && !isDeadAsset(asset),
  );
  const companyOwnedAssets = assets.filter((asset) => Boolean(asset.company) && !asset.vendor).length;
  const vendorAssets = assets.filter((asset) => asset.type === 'Tangible' && Boolean(asset.vendor)).length;
  const availableAssets = assets.filter((asset) => normalizeStatus(asset.status) === 'AVAILABLE' && !isDeadAsset(asset)).length;
  const assignedAssets = assets.filter(
    (asset) => (Boolean(asset.assignedTo) || normalizeStatus(asset.status) === 'ASSIGNED') && !isDeadAsset(asset),
  ).length;
  const deadAssets = assets.filter(isDeadAsset);

  const selectedCompanyAssetType = selectedCompanyAsset?.type === 'Intangible' ? 'Intangible' : 'Tangible';
  const selectedCompanyAssetDetails = selectedCompanyAsset
    ? selectedCompanyAssetType === 'Intangible'
      ? [
          ['Asset Name', selectedCompanyAsset.name],
          ['Asset ID', selectedCompanyAsset.id],
          ['Type', selectedCompanyAsset.type],
          ['Category', selectedCompanyAsset.category],
          ['Status', selectedCompanyAsset.status],
          ['Assigner Location', selectedCompanyAsset.assignerLocation],
          ['Employee Name', selectedCompanyAsset.employeeName || selectedCompanyAsset.assignedTo],
          ['Employee Contact Number', selectedCompanyAsset.employeeContactNumber],
          ['Employment Type', selectedCompanyAsset.employmentType],
          ['Employee Location', selectedCompanyAsset.employeeLocation],
          ['Subscription Type', selectedCompanyAsset.subscriptionType],
          ['Validity Start', selectedCompanyAsset.validityStartDate || selectedCompanyAsset.purchaseDate],
          ['Validity End', selectedCompanyAsset.validityEndDate || selectedCompanyAsset.warrantyPeriod],
          ['Renewal Date', selectedCompanyAsset.renewalDate],
          ['Amount Paid', selectedCompanyAsset.amountPaid],
          ['Vendor', selectedCompanyAsset.vendor || selectedCompanyAsset.vendorName],
          ['License Key', selectedCompanyAsset.licenseKey],
        ]
      : [
          ['Assigner Name', selectedCompanyAsset.name],
          ['Category', selectedCompanyAsset.category],
          ['Asset Name', selectedCompanyAsset.assetName || selectedCompanyAsset.name],
          ['Asset Status', selectedCompanyAsset.status],
          ['Assigner Location', selectedCompanyAsset.assignerLocation],
          ['Emp Name', selectedCompanyAsset.employeeName || selectedCompanyAsset.assignedTo],
          ['Emp Contact No', selectedCompanyAsset.employeeContactNumber],
          ['Employment Type', selectedCompanyAsset.employmentType],
          ['Emp Location', selectedCompanyAsset.employeeLocation],
          ['Ownership', selectedCompanyAsset.company ? 'Company-Owned' : selectedCompanyAsset.vendor ? 'Vendor Asset' : '-'],
          ['Vendor Name', selectedCompanyAsset.vendorName || selectedCompanyAsset.vendor],
          ['Amount', selectedCompanyAsset.amount],
          ['Serial No.', selectedCompanyAsset.serialNumber],
          ['Model No.', selectedCompanyAsset.laptopModelNumber],
          ['Specifications', selectedCompanyAsset.laptopSpecifications],
        ]
    : [];

  const ownershipOther = Math.max(totalAssets - companyOwnedAssets - vendorAssets, 0);
  const lifecycleOther = Math.max(totalAssets - availableAssets - assignedAssets - deadAssets.length, 0);

  const ownershipData = [
    { name: 'Company-Owned', value: companyOwnedAssets },
    { name: 'Vendor', value: vendorAssets },
    { name: 'Other', value: ownershipOther },
  ].filter((item) => item.value > 0);

  const lifecycleData = [
    { name: 'Available', value: availableAssets },
    { name: 'Assigned', value: assignedAssets },
    { name: 'Dead', value: deadAssets.length },
    { name: 'Other', value: lifecycleOther },
  ].filter((item) => item.value > 0);

  const summaryCards = [
    { label: 'Total Assets', value: totalAssets, icon: Package, color: 'text-primary', clickable: true, filter: 'all' as const },
    {
      label: 'Company-Owned Assets',
      value: companyOwnedAssets,
      icon: Building2,
      color: 'text-info',
      clickable: true,
      filter: 'company-owned' as const,
    },
    {
      label: 'Vendor Assets',
      value: vendorAssets,
      icon: CircleAlert,
      color: 'text-warning',
      clickable: true,
      filter: 'vendor' as const,
    },
    { label: 'Available Assets', value: availableAssets, icon: Clock, color: 'text-success', clickable: true, filter: 'available' as const },
    { label: 'Assigned Assets', value: assignedAssets, icon: CheckCircle, color: 'text-primary', clickable: true, filter: 'assigned' as const },
    { label: 'Dead Assets', value: deadAssets.length, icon: Wrench, color: 'text-destructive', clickable: true, filter: 'dead' as const },
  ];

  const openAssetList = (filter: AssetListFilter) => {
    setAssetListFilter(filter);
    if (filter === 'all') {
      setTotalAssetsView('Tangible');
    }
    if (filter === 'available') {
      setAvailableAssetsView('Tangible');
    }
    if (filter === 'assigned') {
      setAssignedAssetsView('Tangible');
    }
    if (filter !== 'company-owned') {
      setSelectedCompanyAsset(null);
      setCompanyAssetInfoOpen(false);
    }
    setAssetListOpen(true);
  };

  const openCompanyAssetInfo = (asset: Asset) => {
    setSelectedCompanyAsset(asset);
    setCompanyAssetInfoOpen(true);
  };

  const closeCompanyAssetInfo = () => {
    setCompanyAssetInfoOpen(false);
    setSelectedCompanyAsset(null);
  };

  const assetListMeta: Record<AssetListFilter, { title: string; description: string; assets: Asset[] }> = {
    all: {
      title: 'Total Assets',
      description: 'Full inventory list with ownership, availability, and status details.',
      assets,
    },
    'company-owned': {
      title: 'Company-Owned Assets',
      description: 'Assets owned and managed by the company.',
      assets: assets.filter((asset) => Boolean(asset.company) && !asset.vendor),
    },
    vendor: {
      title: 'Vendor Assets',
      description: 'Assets supplied or managed by vendors.',
      assets: assets.filter((asset) => asset.type === 'Tangible' && Boolean(asset.vendor)),
    },
    available: {
      title: 'Available Assets',
      description: 'Assets that are currently available for use.',
      assets: assets.filter((asset) => normalizeStatus(asset.status) === 'AVAILABLE' && !isDeadAsset(asset)),
    },
    assigned: {
      title: 'Assigned Assets',
      description: 'Assets that are currently assigned to users or marked as assigned.',
      assets: assets.filter(
        (asset) => (Boolean(asset.assignedTo) || normalizeStatus(asset.status) === 'ASSIGNED') && !isDeadAsset(asset),
      ),
    },
    dead: {
      title: 'Dead Assets',
      description: 'Assets that are unusable, damaged, failed, retired, or otherwise out of service.',
      assets: deadAssets,
    },
  };

  const visibleAssets =
    assetListFilter === 'all'
      ? totalAssetsView === 'Tangible'
        ? tangibleAssets
        : intangibleAssets
      : assetListFilter === 'available'
        ? availableAssetsView === 'Tangible'
          ? availableTangibleAssets
          : availableIntangibleAssets
      : assetListFilter === 'assigned'
        ? assignedAssetsView === 'Tangible'
          ? assignedTangibleAssets
          : assignedIntangibleAssets
      : assetListMeta[assetListFilter].assets;
  const assetListTitle = assetListMeta[assetListFilter].title;
  const assetListDescription =
    assetListFilter === 'all' || assetListFilter === 'available' || assetListFilter === 'assigned'
      ? 'Select Tangible or Intangible to inspect the related assets.'
      : assetListMeta[assetListFilter].description;
  const dialogSizeClass =
    assetListFilter === 'company-owned'
      ? 'flex h-[55vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl'
      : assetListFilter === 'vendor'
        ? 'flex h-[55vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl'
      : 'flex h-[85vh] max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl';

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-0 flex-col gap-6 overflow-y-auto pr-1 pb-6 scrollbar-hide">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          card.clickable ? (
            <button
              key={card.label}
              type="button"
              onClick={() => openAssetList(card.filter ?? 'all')}
              className="block w-full text-left"
            >
              <Card className="transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <card.icon className={`h-8 w-8 ${card.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ) : (
            <Card key={card.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      <Dialog
        open={assetListOpen}
        onOpenChange={(open) => {
          setAssetListOpen(open);
          if (!open) closeCompanyAssetInfo();
        }}
      >
        <DialogContent className={dialogSizeClass}>
          <DialogHeader className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <DialogTitle className="text-xl font-semibold text-slate-900">{assetListTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">{assetListDescription}</DialogDescription>
            {assetListFilter === 'all' || assetListFilter === 'available' || assetListFilter === 'assigned' ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    assetListFilter === 'available'
                      ? setAvailableAssetsView('Tangible')
                      : assetListFilter === 'assigned'
                        ? setAssignedAssetsView('Tangible')
                        : setTotalAssetsView('Tangible')
                  }
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    (assetListFilter === 'available'
                      ? availableAssetsView
                      : assetListFilter === 'assigned'
                        ? assignedAssetsView
                        : totalAssetsView) === 'Tangible'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">Tangible</p>
                  <p className="text-xs text-slate-600">
                    {assetListFilter === 'available'
                      ? availableTangibleAssets.length
                      : assetListFilter === 'assigned'
                        ? assignedTangibleAssets.length
                        : tangibleAssets.length} assets
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    assetListFilter === 'available'
                      ? setAvailableAssetsView('Intangible')
                      : assetListFilter === 'assigned'
                        ? setAssignedAssetsView('Intangible')
                        : setTotalAssetsView('Intangible')
                  }
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    (assetListFilter === 'available'
                      ? availableAssetsView
                      : assetListFilter === 'assigned'
                        ? assignedAssetsView
                        : totalAssetsView) === 'Intangible'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">Intangible</p>
                  <p className="text-xs text-slate-600">
                    {assetListFilter === 'available'
                      ? availableIntangibleAssets.length
                      : assetListFilter === 'assigned'
                        ? assignedIntangibleAssets.length
                        : intangibleAssets.length} assets
                  </p>
                </button>
              </div>
            ) : null}
          </DialogHeader>
          <ScrollArea type="always" className="min-h-0 flex-1 bg-white px-6 pb-5 pt-0">
            {assetListFilter === 'all' ? (
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Assigner Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Category</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Employee Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAssets.map((asset) => (
                    <TableRow key={asset.id} className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm [&>*:not(:first-child)]:hidden">
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <p className="truncate font-medium text-slate-900">{asset.name || '-'}</p>
                        </div>
                        {assetListFilter === 'all' ? (
                          <button
                            type="button"
                            onClick={() => openCompanyAssetInfo(asset)}
                            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`View details for ${asset.name || 'asset'}`}
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        ) : null}
                      </TableCell>
                      <TableCell className="truncate">{asset.category || '-'}</TableCell>
                      <TableCell className="truncate">{asset.assetName || asset.name || '-'}</TableCell>
                      <TableCell className="truncate">{asset.employeeName || asset.assignedTo || '-'}</TableCell>
                      <TableCell className="px-4 py-4">
                        <StatusBadge status={asset.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : assetListFilter === 'available' ? (
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Assigner Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Category</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{asset.name || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="truncate">{asset.category || '-'}</TableCell>
                      <TableCell className="truncate">{asset.assetName || asset.name || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : assetListFilter === 'assigned' ? (
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[24%]" />
                  <col className="w-[34%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Assigner Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Employee Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">More Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{asset.name || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="truncate">{''}</TableCell>
                      <TableCell className="truncate">{asset.employeeName || asset.assignedTo || '-'}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openCompanyAssetInfo(asset)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`View details for ${asset.name || 'assigned asset'}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : assetListFilter === 'vendor' ? (
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <TableHeader className="hidden sticky top-0 z-20">
                  <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset Name</TableHead>
                    <TableHead className="hidden h-14 border-b-0 px-4 font-semibold text-white">Employee Name</TableHead>
                    <TableHead className="hidden h-14 border-b-0 px-4 font-semibold text-white">Category</TableHead>
                    <TableHead className="hidden h-14 border-b-0 px-4 font-semibold text-white">Vendor Name</TableHead>
                    <TableHead className="hidden h-14 border-b-0 px-4 font-semibold text-white">Amount</TableHead>
                    <TableHead className="hidden h-14 border-b-0 px-4 font-semibold text-white">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAssets.map((asset) => (
                    <TableRow key={asset.id} className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm [&>*:not(:first-child)]:hidden">
                      <TableCell className="flex flex-1 items-center p-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{asset.name || '-'}</p>
                          <p className="hidden text-xs text-muted-foreground">{asset.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCompanyAssetInfo(asset)}
                          className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`View details for ${asset.name || 'vendor asset'}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell className="truncate">{asset.employeeName || asset.assignedTo || '-'}</TableCell>
                      <TableCell className="truncate">{asset.category || '-'}</TableCell>
                      <TableCell className="truncate">{asset.vendorName || asset.vendor || '-'}</TableCell>
                      <TableCell className="truncate">{asset.amount ?? asset.amountPaid ?? '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : assetListFilter === 'company-owned' ? (
              <div className="grid gap-3 p-2">
                {visibleAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{asset.name || '-'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCompanyAssetInfo(asset)}
                      className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`View details for ${asset.name || 'company-owned asset'}`}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : assetListFilter === 'dead' ? (
              <Table className="table-fixed w-full">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Assigner Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Emp Name</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Status</TableHead>
                    <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="truncate font-medium text-slate-900">{asset.assetName || asset.name || '-'}</TableCell>
                      <TableCell className="truncate">{asset.name || '-'}</TableCell>
                      <TableCell className="truncate">{asset.employeeName || asset.assignedTo || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell className="truncate">{getDeadReason(asset)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table className="table-fixed w-full">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
              </colgroup>
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="border-b-0 bg-[#0b2a59] hover:bg-[#0b2a59]">
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Asset</TableHead>
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Type</TableHead>
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Ownership</TableHead>
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Status</TableHead>
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">Assigned To</TableHead>
                  <TableHead className="h-14 border-b-0 px-4 font-semibold text-white">
                    {assetListFilter === 'dead' ? 'Reason' : 'Category'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <p className="truncate font-medium text-slate-900">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell className="truncate">
                      {asset.vendor ? 'Vendor Asset' : asset.company ? 'Company-Owned' : 'Other'}
                    </TableCell>
                    <TableCell><StatusBadge status={asset.status} /></TableCell>
                    <TableCell className="truncate">{asset.assignedTo || '-'}</TableCell>
                    <TableCell className="truncate">
                      {assetListFilter === 'dead' ? getDeadReason(asset) : asset.category || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={companyAssetInfoOpen} onOpenChange={(open) => (open ? setCompanyAssetInfoOpen(true) : closeCompanyAssetInfo())}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {selectedCompanyAsset?.name || 'Asset Details'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {selectedCompanyAssetType === 'Intangible'
                ? 'Full information for the selected intangible asset.'
                : 'Full information for the selected tangible asset.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-6rem)] px-6 py-5">
            {selectedCompanyAsset ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedCompanyAssetDetails.map(([label, value]) => (
                  <div key={label as string} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-900">
                      {value != null && String(value).trim() !== '' ? String(value) : '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-lg">Asset Ownership</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ownershipData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {ownershipData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lifecycle Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lifecycleData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


