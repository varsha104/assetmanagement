import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadges';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types';

type TangibleFormState = {
  name: string;
  category: string;
  status: 'Available' | 'Assigned';
  ownership: 'Company-Owned' | 'Vendor Asset';
  assignerLocation: string;
  employeeName: string;
  employeeContactNumber: string;
  employmentType: 'Permanent' | 'Contract';
  serialNumber: string;
  laptopModelNumber: string;
  laptopSpecifications: string;
  vendorName: string;
  location: string;
};

const emptyForm = (): TangibleFormState => ({
  name: '',
  category: 'Laptop',
  status: 'Available',
  ownership: 'Company-Owned',
  assignerLocation: '',
  employeeName: '',
  employeeContactNumber: '',
  employmentType: 'Permanent',
  serialNumber: '',
  laptopModelNumber: '',
  laptopSpecifications: '',
  vendorName: '',
  location: '',
});

export default function TangibleAssetManagement() {
  const { user } = useAuth();
  const { assets, addAsset, updateAsset, deleteAsset, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<TangibleFormState>(emptyForm());

  const today = new Date().toISOString().slice(0, 10);
  const tangibleAssets = assets.filter((asset) => asset.type === 'Tangible');

  const filteredAssets = tangibleAssets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.vendorName || asset.vendor || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name || '',
      category: asset.category || 'Laptop',
      status: (asset.status === 'Assigned' ? 'Assigned' : 'Available') as 'Available' | 'Assigned',
      ownership: asset.vendorName || asset.vendor ? 'Vendor Asset' : 'Company-Owned',
      assignerLocation: asset.assignerLocation || '',
      employeeName: asset.employeeName || asset.assignedTo || '',
      employeeContactNumber: asset.employeeContactNumber || '',
      employmentType: (asset.employmentType === 'Contract' ? 'Contract' : 'Permanent') as 'Permanent' | 'Contract',
      serialNumber: asset.serialNumber || '',
      laptopModelNumber: asset.laptopModelNumber || '',
      laptopSpecifications: asset.laptopSpecifications || '',
      vendorName: asset.vendorName || asset.vendor || '',
      location: asset.location || '',
    });
    setDialogOpen(true);
  };

  const resetAndClose = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.serialNumber) {
      toast({
        title: 'Missing fields',
        description: 'Please enter asset name, category, and serial number.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: 'Tangible' as const,
        category: form.category,
        purchaseDate: today,
        warrantyPeriod: 'N/A',
        status: form.status,
        approvalStatus: 'Approved' as const,
        assignedTo: form.status === 'Assigned' && form.employeeName ? form.employeeName : undefined,
        createdBy: user?.id || 'higher_management',
        assignerLocation: form.assignerLocation,
        employeeName: form.employeeName,
        employeeContactNumber: form.employeeContactNumber,
        employmentType: form.employmentType,
        serialNumber: form.serialNumber,
        laptopModelNumber: form.laptopModelNumber,
        laptopSpecifications: form.laptopSpecifications,
        vendorName: form.ownership === 'Vendor Asset' ? form.vendorName : '',
        vendor: form.ownership === 'Vendor Asset' ? form.vendorName : '',
        company: form.ownership === 'Company-Owned' ? 'Company-Owned' : '',
        location: form.location,
        condition: form.status === 'Assigned' ? 'Used' : 'New',
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
    deleteAsset(id);
    toast({ title: 'Tangible asset removed' });
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tangible Asset Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage laptops and other physical assets with assignment and device details.
          </p>
        </div>
        <Button onClick={openAdd} className="w-full lg:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Tangible Asset
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg">Tangible Assets</CardTitle>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, serial number, vendor, or location"
                  className="h-11 pl-10"
                />
              </div>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-[#0b2a59] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Asset</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Ownership</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact No.</th>
                  <th className="px-4 py-3 text-left font-semibold">Employment Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Serial No.</th>
                  <th className="px-4 py-3 text-left font-semibold">Model No.</th>
                  <th className="px-4 py-3 text-left font-semibold">Vendor Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Location</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No tangible assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-t">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">{asset.id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-4">{asset.vendor ? 'Vendor Asset' : 'Company-Owned'}</td>
                      <td className="px-4 py-4">{asset.employeeName || asset.assignedTo || '—'}</td>
                      <td className="px-4 py-4">{asset.employeeContactNumber || '—'}</td>
                      <td className="px-4 py-4">{asset.employmentType || '—'}</td>
                      <td className="px-4 py-4">{asset.serialNumber || '—'}</td>
                      <td className="px-4 py-4">{asset.laptopModelNumber || '—'}</td>
                      <td className="px-4 py-4">{asset.vendorName || asset.vendor || '—'}</td>
                      <td className="px-4 py-4">{asset.location || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(asset)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(asset.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
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
              <Label>Assigner Location</Label>
              <Input value={form.assignerLocation} onChange={(e) => setForm((prev) => ({ ...prev, assignerLocation: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Input value={form.employeeName} onChange={(e) => setForm((prev) => ({ ...prev, employeeName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Employee Contact Number</Label>
              <Input value={form.employeeContactNumber} onChange={(e) => setForm((prev) => ({ ...prev, employeeContactNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(value) => setForm((prev) => ({ ...prev, employmentType: value as 'Permanent' | 'Contract' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Laptop Model Number</Label>
              <Input value={form.laptopModelNumber} onChange={(e) => setForm((prev) => ({ ...prev, laptopModelNumber: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Laptop Specifications</Label>
              <Textarea
                value={form.laptopSpecifications}
                onChange={(e) => setForm((prev) => ({ ...prev, laptopSpecifications: e.target.value }))}
                rows={3}
              />
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
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
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
    </div>
  );
}
