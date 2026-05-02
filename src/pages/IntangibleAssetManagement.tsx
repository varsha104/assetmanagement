import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
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
import { StatusBadge } from '@/components/StatusBadges';
import { Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset } from '@/types';

const ASSIGNER_LOCATIONS = ['Banglore', 'Hyderabad', 'Vijayawada'] as const;
const INTANGIBLE_CATEGORIES = ['Software License', 'Cloud Subscription'] as const;

function normalizeAssignerLocation(value?: string) {
  return ASSIGNER_LOCATIONS.includes(value as (typeof ASSIGNER_LOCATIONS)[number]) ? value || '' : '';
}

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
  const { assets, addAsset, updateAsset, deleteAsset, employees, isLoading } = useData();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Available' | 'Assigned'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<IntangibleFormState>(emptyForm());
  const employeeDetailsDisabled = form.status === 'Available';

  const intangibleAssets = assets.filter((asset) => asset.type === 'Intangible');
  const getEmployeeForAsset = (asset: Asset) =>
    employees.find((employee) => employee.name === (asset.employeeName || asset.assignedTo || ''));
  const getEmployeeRoleForAsset = (asset: Asset) => asset.employeeRole || getEmployeeForAsset(asset)?.role || '';

  const filteredAssets = intangibleAssets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.subscriptionType || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.employeeName || asset.assignedTo || '').toLowerCase().includes(search.toLowerCase()) ||
      (asset.assignerLocation || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
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

  const handleDelete = async (id: string) => {
    deleteAsset(id);
    toast({ title: 'Intangible asset removed' });
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
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="max-h-[calc(100vh-14rem)] overflow-x-auto overflow-y-auto scrollbar-thin">
          <table className="min-w-[1600px] w-full text-sm">
            <thead className="sticky top-0 z-20 bg-[#0b2a59] text-white">
              <tr>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Assigner Name</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Category</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Status</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Assigner Location</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Emp Name</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Emp Contact No</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Employment Type</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Role</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Emp Location</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Subscription Type</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Start Date</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Expiry Date</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Renewal Date</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-left font-semibold">Amount Paid</th>
                <th className="bg-[#0b2a59] px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No intangible assets found.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-t">
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
                                onClick={() => handleDelete(asset.id)}
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
            <DialogTitle>{editingId ? 'Edit Intangible Asset' : 'Add Intangible Asset'}</DialogTitle>
            <DialogDescription>
              Fill in the digital asset details required for intangible asset management.
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
