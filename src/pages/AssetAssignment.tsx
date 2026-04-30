import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadges';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Monitor, Cloud, Loader2 } from 'lucide-react';
import { Asset } from '@/types';
import { productApi, intangibleApi } from '@/services/api';
import { ColumnFilter, getUniqueValues, SortDir } from '@/components/ColumnFilter';

function isReturnPendingStatus(status?: string) {
  const normalized = (status || '').trim().toUpperCase().replace(/\s+/g, '_');
  return normalized === 'RETURN' || normalized === 'RETURNED' || normalized === 'RETURN_REQUESTED';
}

export default function AssetAssignment() {
  const { user } = useAuth();
  const { assets, isLoading, refreshData } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Tangible' | 'Intangible'>('Tangible');
  const [isReturning, setIsReturning] = useState<string | null>(null);

  // Column filter states for tangible assigned
  const [atFilterEmployee, setAtFilterEmployee] = useState<string[]>([]);
  const [atFilterCompany, setAtFilterCompany] = useState<string[]>([]);
  const [atFilterCondition, setAtFilterCondition] = useState<string[]>([]);
  const [atFilterStatus, setAtFilterStatus] = useState<string[]>([]);
  // Column filter states for intangible assigned
  const [aiFilterAssigned, setAiFilterAssigned] = useState<string[]>([]);
  const [aiFilterVendor, setAiFilterVendor] = useState<string[]>([]);
  const [aiFilterStatus, setAiFilterStatus] = useState<string[]>([]);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const canAssignAsset = user?.role === 'higher_management' || user?.role === 'admin' || user?.role === 'it_admin';

  // Only show assets that ARE assigned to someone
  const assignedAssets = assets.filter(a => !!a.assignedTo);

  const filteredUnsorted = assignedAssets.filter(a => {
    const matchType = a.type === activeTab;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
    if (!matchType || !matchSearch) return false;

    if (a.type === 'Tangible') {
      if (atFilterEmployee.length > 0 && !atFilterEmployee.includes(a.employeeName || a.assignedTo || '')) return false;
      if (atFilterCompany.length > 0 && !atFilterCompany.includes(a.company || '')) return false;
      if (atFilterCondition.length > 0 && !atFilterCondition.includes(a.condition || '')) return false;
      if (atFilterStatus.length > 0 && !atFilterStatus.includes(a.status)) return false;
    } else {
      if (aiFilterAssigned.length > 0 && !aiFilterAssigned.includes(a.assignedTo || '')) return false;
      if (aiFilterVendor.length > 0 && !aiFilterVendor.includes(a.vendor || '')) return false;
      if (aiFilterStatus.length > 0 && !aiFilterStatus.includes(a.status)) return false;
    }
    return true;
  });

  // Sort helper
  const handleSort = (col: string) => (dir: SortDir) => {
    setSortColumn(dir ? col : null);
    setSortDir(dir);
  };
  const getSortDir = (col: string): SortDir => sortColumn === col ? sortDir : null;

  const filtered = [...filteredUnsorted].sort((a, b) => {
    if (!sortColumn || !sortDir) return 0;
    const accessor: Record<string, (item: Asset) => string> = {
      'name': i => i.name || '',
      'employee': i => i.employeeName || i.assignedTo || '',
      'company': i => i.company || '',
      'serialNumber': i => i.serialNumber || '',
      'condition': i => i.condition || '',
      'status': i => i.status || '',
      'assignedTo': i => i.assignedTo || '',
      'vendor': i => i.vendor || '',
      'licenseKey': i => i.licenseKey || '',
      'validityStart': i => i.validityStartDate || '',
    };
    const fn = accessor[sortColumn];
    if (!fn) return 0;
    const va = fn(a).toLowerCase();
    const vb = fn(b).toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const tangibleCount = assignedAssets.filter(a => a.type === 'Tangible').length;
  const intangibleCount = assignedAssets.filter(a => a.type === 'Intangible').length;

  const isItAdmin = user?.role === 'higher_management' || user?.role === 'it_admin';
  const showActionCol = isItAdmin && filtered.some(a => isReturnPendingStatus(a.status));

  const handleVerifyReturn = async (assetId: string) => {
    setIsReturning(assetId);
    try {
      const numericId = parseInt(assetId.replace('INT-', ''), 10);
      const res = await productApi.itadminVerifyReturn(numericId);
      if (res.ok) {
        toast({ title: 'Return verified successfully' });
        await refreshData();
      } else {
        toast({ title: res.error || 'Failed to verify return', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'An error occurred', description: err.message, variant: 'destructive' });
    } finally {
      setIsReturning(null);
    }
  };

  // ── Tangible Assigned Table ──────────────────────────────────────────────

  const tangibleAssigned = assignedAssets.filter(a => a.type === 'Tangible');
  const intangibleAssigned = assignedAssets.filter(a => a.type === 'Intangible');
  const atEmployeeOptions = getUniqueValues(tangibleAssigned, a => a.employeeName || a.assignedTo);
  const atCompanyOptions = getUniqueValues(tangibleAssigned, a => a.company);
  const atConditionOptions = getUniqueValues(tangibleAssigned, a => a.condition);
  const atStatusOptions = getUniqueValues(tangibleAssigned, a => a.status);
  const aiAssignedOptions = getUniqueValues(intangibleAssigned, a => a.assignedTo);
  const aiVendorOptions = getUniqueValues(intangibleAssigned, a => a.vendor);
  const aiStatusOptions = getUniqueValues(intangibleAssigned, a => a.status);

  const tangibleColCount = showActionCol ? 8 : 7;

  const renderTangibleTable = () => (
    <div className="overflow-auto max-h-[65vh] rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead><ColumnFilter title="Product Name" options={getUniqueValues(tangibleAssigned, a => a.name)} selected={[]} onChange={() => { }} sortDir={getSortDir('name')} onSort={handleSort('name')} /></TableHead>
            <TableHead><ColumnFilter title="Employee" options={atEmployeeOptions} selected={atFilterEmployee} onChange={setAtFilterEmployee} sortDir={getSortDir('employee')} onSort={handleSort('employee')} /></TableHead>
            <TableHead><ColumnFilter title="Company" options={atCompanyOptions} selected={atFilterCompany} onChange={setAtFilterCompany} sortDir={getSortDir('company')} onSort={handleSort('company')} /></TableHead>
            <TableHead><ColumnFilter title="Serial Number" options={getUniqueValues(tangibleAssigned, a => a.serialNumber)} selected={[]} onChange={() => { }} sortDir={getSortDir('serialNumber')} onSort={handleSort('serialNumber')} /></TableHead>
            <TableHead><ColumnFilter title="Condition" options={atConditionOptions} selected={atFilterCondition} onChange={setAtFilterCondition} sortDir={getSortDir('condition')} onSort={handleSort('condition')} /></TableHead>
            <TableHead><ColumnFilter title="Status" options={atStatusOptions} selected={atFilterStatus} onChange={setAtFilterStatus} sortDir={getSortDir('status')} onSort={handleSort('status')} /></TableHead>
            {showActionCol && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </thead>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={tangibleColCount} className="text-center text-muted-foreground py-8">No assigned tangible assets</TableCell></TableRow>
          ) : (
            filtered.map(asset => (
              <TableRow key={asset.id}>
                <TableCell className="font-mono text-xs">{asset.id}</TableCell>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.employeeName || asset.assignedTo || '—'}</TableCell>
                <TableCell>{asset.company || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{asset.serialNumber || '—'}</TableCell>
                <TableCell>{asset.condition || '—'}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
                {showActionCol && (
                  <TableCell className="text-right">
                    {isReturnPendingStatus(asset.status) ? (
                      <Button size="sm" onClick={() => handleVerifyReturn(asset.id)} disabled={isReturning === asset.id}>
                        {isReturning === asset.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Return Accepted
                      </Button>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );

  // ── Intangible Assigned Table ────────────────────────────────────────────

  const intangibleColCount = showActionCol ? 9 : 8;

  const renderIntangibleTable = () => (
    <div className="overflow-auto max-h-[65vh] rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead><ColumnFilter title="Name" options={getUniqueValues(intangibleAssigned, a => a.name)} selected={[]} onChange={() => { }} sortDir={getSortDir('name')} onSort={handleSort('name')} /></TableHead>
            <TableHead><ColumnFilter title="Assigned To" options={aiAssignedOptions} selected={aiFilterAssigned} onChange={setAiFilterAssigned} sortDir={getSortDir('assignedTo')} onSort={handleSort('assignedTo')} /></TableHead>
            <TableHead><ColumnFilter title="License Key" options={getUniqueValues(intangibleAssigned, a => a.licenseKey)} selected={[]} onChange={() => { }} sortDir={getSortDir('licenseKey')} onSort={handleSort('licenseKey')} /></TableHead>
            <TableHead><ColumnFilter title="Vendor" options={aiVendorOptions} selected={aiFilterVendor} onChange={setAiFilterVendor} sortDir={getSortDir('vendor')} onSort={handleSort('vendor')} /></TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead><ColumnFilter title="Validity Start" options={getUniqueValues(intangibleAssigned, a => a.validityStartDate)} selected={[]} onChange={() => { }} sortDir={getSortDir('validityStart')} onSort={handleSort('validityStart')} /></TableHead>
            <TableHead><ColumnFilter title="Status" options={aiStatusOptions} selected={aiFilterStatus} onChange={setAiFilterStatus} sortDir={getSortDir('status')} onSort={handleSort('status')} /></TableHead>
            {showActionCol && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </thead>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={intangibleColCount} className="text-center text-muted-foreground py-8">No assigned intangible assets</TableCell></TableRow>
          ) : (
            filtered.map(asset => (
              <TableRow key={asset.id}>
                <TableCell className="font-mono text-xs">{asset.id}</TableCell>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.assignedTo || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{asset.licenseKey || '—'}</TableCell>
                <TableCell>{asset.vendor || '—'}</TableCell>
                <TableCell>{asset.subscriptionType || '—'}</TableCell>
                <TableCell>{asset.validityStartDate || '—'}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
                {showActionCol && (
                  <TableCell className="text-right">
                    {isReturnPendingStatus(asset.status) ? (
                      <Button size="sm" onClick={() => handleVerifyReturn(asset.id)} disabled={isReturning === asset.id}>
                        {isReturning === asset.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Return Accepted
                      </Button>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );

  // ── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Asset Allocation</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'Tangible' | 'Intangible'); setSearch(''); }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <TabsList className="bg-slate-50 border border-slate-200 p-1 rounded-lg shadow-sm">
            <TabsTrigger value="Tangible" className="gap-2 rounded-md px-5 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200 transition-all font-medium">
              <Monitor className="w-4 h-4" />
              Tangible ({tangibleCount})
            </TabsTrigger>
            <TabsTrigger value="Intangible" className="gap-2 rounded-md px-5 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200 transition-all font-medium">
              <Cloud className="w-4 h-4" />
              Intangible ({intangibleCount})
            </TabsTrigger>
          </TabsList>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search assigned assets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="Tangible" className="mt-4">
          <Card>
            <CardContent className=" px-0 pb-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : renderTangibleTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Intangible" className="mt-4">
          <Card>
            <CardContent className=" px-0 pb-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : renderIntangibleTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
