import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { StatusBadge } from '@/components/StatusBadges';
import { Package, Building2, CheckCircle, Clock, AlertTriangle, Loader2, Wrench, CircleAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Asset } from '@/types';

const CHART_COLORS = ['hsl(217, 91%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];
type AssetListFilter = 'all' | 'company-owned' | 'vendor' | 'available' | 'assigned' | 'dead';
const DEAD_STATUS_KEYS = new Set([
  'DEAD',
  'DAMAGED',
  'FAILED',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  const totalAssets = assets.length;
  const companyOwnedAssets = assets.filter((asset) => Boolean(asset.company) && !asset.vendor).length;
  const vendorAssets = assets.filter((asset) => Boolean(asset.vendor)).length;
  const availableAssets = assets.filter((asset) => normalizeStatus(asset.status) === 'AVAILABLE' && !isDeadAsset(asset)).length;
  const assignedAssets = assets.filter(
    (asset) => (Boolean(asset.assignedTo) || normalizeStatus(asset.status) === 'ASSIGNED') && !isDeadAsset(asset),
  ).length;
  const deadAssets = assets.filter(isDeadAsset);

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
    setAssetListOpen(true);
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
      assets: assets.filter((asset) => Boolean(asset.vendor)),
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

  const visibleAssets = assetListMeta[assetListFilter].assets;
  const assetListTitle = assetListMeta[assetListFilter].title;
  const assetListDescription = assetListMeta[assetListFilter].description;

  return (
    <div className="space-y-6">
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

      <Dialog open={assetListOpen} onOpenChange={setAssetListOpen}>
        <DialogContent className="flex h-[85vh] max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <DialogTitle className="text-xl font-semibold text-slate-900">{assetListTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">{assetListDescription}</DialogDescription>
          </DialogHeader>
          <ScrollArea type="always" className="min-h-0 flex-1 bg-white px-6 pb-5 pt-0">
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
                        <p className="font-medium text-slate-900">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell className="truncate">
                      {asset.vendor ? 'Vendor Asset' : asset.company ? 'Company-Owned' : 'Other'}
                    </TableCell>
                    <TableCell><StatusBadge status={asset.status} /></TableCell>
                    <TableCell className="truncate">{asset.assignedTo || '—'}</TableCell>
                    <TableCell className="truncate">
                      {assetListFilter === 'dead' ? getDeadReason(asset) : asset.category || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dead Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {deadAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dead assets recorded.</p>
          ) : (
            <div className="space-y-3">
              {deadAssets.map((asset) => (
                <div key={asset.id} className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-sm">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.type} · {asset.category} · {asset.id}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <StatusBadge status={asset.status} />
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                      <span className="max-w-[520px] text-right">{getDeadReason(asset)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
