import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { Loader2, Mail, MessageCircle, MoreVertical, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mailApi } from '@/services/api';
import { ColumnFilter } from '@/components/ColumnFilter';

const EMPLOYEE_LOCATIONS = ['Hyderabad', 'Banglore', 'Vijayawada'] as const;
const WHATSAPP_NUMBER_DIGIT_LIMIT = 10;

type EmployeeFormState = {
  name: string;
  email: string;
  whatsappNumber: string;
  alternateNumber: string;
  employmentType: 'Permanent' | 'Contract';
  role: string;
  location: string;
};

type EmployeeMailTarget = {
  id: string;
  name: string;
  email: string;
};

const emptyEmployeeForm = (): EmployeeFormState => ({
  name: '',
  email: '',
  whatsappNumber: '',
  alternateNumber: '',
  employmentType: 'Permanent',
  role: '',
  location: '',
});

function formatWhatsAppNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, WHATSAPP_NUMBER_DIGIT_LIMIT);
}

function getWhatsAppChatUrl(phoneNumber?: string) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) return null;

  const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${whatsappNumber}`;
}

export default function EmployeeManagement() {
  const { employees, addEmployee, updateEmployee, isLoading } = useData();
  const { toast } = useToast();
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(emptyEmployeeForm());
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeMailTarget, setEmployeeMailTarget] = useState<EmployeeMailTarget | null>(null);
  const [employeeMailSubject, setEmployeeMailSubject] = useState('');
  const [employeeMailBody, setEmployeeMailBody] = useState('');
  const [employeeMailSending, setEmployeeMailSending] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string[]>([]);

  const sortedEmployeeRows = useMemo(() => {
    const totalEmployees = employees.length;

    return employees
      .map((employee, index) => {
        const id = String(employee.id || '');
        const localTimestamp = id.startsWith('local-') ? Number(id.replace('local-', '')) : Number.NaN;
        const numericId = Number(id);
        const orderValue = Number.isFinite(localTimestamp)
          ? localTimestamp
          : Number.isFinite(numericId)
            ? numericId
            : totalEmployees - index;

        return { employee, orderValue, index };
      })
      .sort((a, b) => b.orderValue - a.orderValue || a.index - b.index)
      .map(({ employee }) => employee);
  }, [employees]);

  const roleOptions = useMemo(
    () =>
      Array.from(new Set(sortedEmployeeRows.map((employee) => employee.role?.trim()).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [sortedEmployeeRows],
  );

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...EMPLOYEE_LOCATIONS,
          ...sortedEmployeeRows.map((employee) => employee.location?.trim()).filter(Boolean),
        ] as string[]),
      ).sort((a, b) => a.localeCompare(b)),
    [sortedEmployeeRows],
  );

  const employeeRows = useMemo(
    () =>
      sortedEmployeeRows.filter((employee) => {
        if (locationFilter.length > 0 && !locationFilter.includes(employee.location?.trim() || '')) return false;
        if (roleFilter.length > 0 && !roleFilter.includes(employee.role?.trim() || '')) return false;
        if (employmentTypeFilter.length > 0 && !employmentTypeFilter.includes(employee.employmentType?.trim() || '')) return false;
        return true;
      }),
    [employmentTypeFilter, locationFilter, roleFilter, sortedEmployeeRows],
  );

  const hasActiveFilters = locationFilter.length > 0 || roleFilter.length > 0 || employmentTypeFilter.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading employees...</span>
      </div>
    );
  }

  const openEmployeeDialog = () => {
    setEditingEmployeeId(null);
    setEmployeeForm(emptyEmployeeForm());
    setEmployeeDialogOpen(true);
  };

  const closeEmployeeDialog = () => {
    setEmployeeDialogOpen(false);
    setEmployeeSubmitting(false);
    setEditingEmployeeId(null);
    setEmployeeForm(emptyEmployeeForm());
  };

  const openEmployeeEditDialog = (employee: typeof employeeRows[number]) => {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      name: employee.name || '',
      email: employee.email || '',
      whatsappNumber: employee.whatsappNumber || '',
      alternateNumber: employee.alternateNumber || '',
      employmentType: employee.employmentType === 'Contract' ? 'Contract' : 'Permanent',
      role: employee.role || '',
      location: employee.location || '',
    });
    setEmployeeDialogOpen(true);
  };

  const openEmployeeMailDialog = (employee: typeof employeeRows[number]) => {
    if (!employee.email) return;

    setEmployeeMailTarget({
      id: employee.id,
      name: employee.name || 'Employee',
      email: employee.email,
    });
    setEmployeeMailSubject('');
    setEmployeeMailBody('');
  };

  const closeEmployeeMailDialog = () => {
    setEmployeeMailTarget(null);
    setEmployeeMailSubject('');
    setEmployeeMailBody('');
    setEmployeeMailSending(false);
  };

  const handleEmployeeMailSend = async () => {
    if (!employeeMailTarget) return;

    const subject = employeeMailSubject.trim();
    const body = employeeMailBody.trim();

    if (!subject || !body) {
      toast({
        title: 'Missing email content',
        description: 'Please enter both subject and message.',
        variant: 'destructive',
      });
      return;
    }

    setEmployeeMailSending(true);
    try {
      const result = await mailApi.sendEmployeeMail({
        to: employeeMailTarget.email,
        subject,
        body,
        employeeName: employeeMailTarget.name,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Email could not be sent.');
      }

      toast({
        title: 'Email sent',
        description: `Email sent to ${employeeMailTarget.email}.`,
      });
      closeEmployeeMailDialog();
    } catch (error) {
      toast({
        title: 'Email failed',
        description: error instanceof Error ? error.message : 'Email could not be sent.',
        variant: 'destructive',
      });
    } finally {
      setEmployeeMailSending(false);
    }
  };

  const handleEmployeeSubmit = async () => {
    if (!employeeForm.name.trim() || !employeeForm.whatsappNumber.trim() || !employeeForm.role.trim() || !employeeForm.location.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please enter employee name, WhatsApp number, role, and location.',
        variant: 'destructive',
      });
      return;
    }

    if (employeeForm.whatsappNumber.length !== WHATSAPP_NUMBER_DIGIT_LIMIT) {
      toast({
        title: 'Invalid WhatsApp number',
        description: 'WhatsApp number must be exactly 10 digits.',
        variant: 'destructive',
      });
      return;
    }

    if (employeeForm.alternateNumber.trim() && employeeForm.alternateNumber.length !== WHATSAPP_NUMBER_DIGIT_LIMIT) {
      toast({
        title: 'Invalid alternate number',
        description: 'Alternate number must be exactly 10 digits when provided.',
        variant: 'destructive',
      });
      return;
    }

    setEmployeeSubmitting(true);
    try {
      const payload = {
        name: employeeForm.name,
        email: employeeForm.email,
        whatsappNumber: employeeForm.whatsappNumber,
        alternateNumber: employeeForm.alternateNumber,
        employmentType: employeeForm.employmentType,
        role: employeeForm.role,
        location: employeeForm.location,
      };
      if (editingEmployeeId) {
        await updateEmployee(editingEmployeeId, payload);
        toast({ title: 'Employee updated' });
      } else {
        await addEmployee(payload);
        toast({ title: 'Employee added' });
      }
      closeEmployeeDialog();
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save employee.',
        variant: 'destructive',
      });
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-0 flex-col gap-6 overflow-hidden pr-1 pb-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee details used across tangible and intangible asset forms.
          </p>
        </div>
        <Button onClick={openEmployeeDialog} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Employee
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{employees.length}</span>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="shrink-0 border-b bg-[#0b2a59] px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Employee Details</h2>
              <p className="text-sm text-white/80">Employees saved here are available across asset assignment forms.</p>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
              {employeeRows.length}
              {hasActiveFilters ? ` of ${sortedEmployeeRows.length}` : ''} employees
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <table className="w-full min-w-[1180px] caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">Emp Name</TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">
                  <ColumnFilter title="Role" options={roleOptions} selected={roleFilter} onChange={setRoleFilter} />
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">Emp Mail</TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">WhatsApp No</TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">Alternate No</TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">
                  <ColumnFilter
                    title="Employment Type"
                    options={['Permanent', 'Contract']}
                    selected={employmentTypeFilter}
                    onChange={setEmploymentTypeFilter}
                  />
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-white font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">
                  <ColumnFilter title="Location" options={locationOptions} selected={locationFilter} onChange={setLocationFilter} />
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-white text-right font-bold text-black shadow-[inset_0_-1px_0_#e2e8f0]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {hasActiveFilters ? 'No employees match the selected filters.' : 'No employees added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                employeeRows.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role || '-'}</TableCell>
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell>{employee.whatsappNumber || '-'}</TableCell>
                    <TableCell>{employee.alternateNumber || '-'}</TableCell>
                    <TableCell>{employee.employmentType || '-'}</TableCell>
                    <TableCell>{employee.location || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Open actions for ${employee.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {employee.email ? (
                            <DropdownMenuItem onClick={() => openEmployeeMailDialog(employee)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Mail
                            </DropdownMenuItem>
                          ) : null}
                          {getWhatsAppChatUrl(employee.whatsappNumber) ? (
                            <DropdownMenuItem asChild>
                              <a
                                href={getWhatsAppChatUrl(employee.whatsappNumber) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                WhatsApp
                              </a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => openEmployeeEditDialog(employee)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>

      <Dialog open={employeeDialogOpen} onOpenChange={(open) => (open ? setEmployeeDialogOpen(true) : closeEmployeeDialog())}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              {editingEmployeeId ? 'Update the employee details used across both asset forms.' : 'Capture the employee details used across both asset forms.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employee-name">Employee Name</Label>
              <Input
                id="employee-name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter employee name"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-whatsapp-number">WhatsApp Number</Label>
              <Input
                id="employee-whatsapp-number"
                value={employeeForm.whatsappNumber}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, whatsappNumber: formatWhatsAppNumber(e.target.value) }))}
                inputMode="numeric"
                maxLength={WHATSAPP_NUMBER_DIGIT_LIMIT}
                placeholder="Enter WhatsApp number"
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                value={employeeForm.employmentType}
                onValueChange={(value) =>
                  setEmployeeForm((prev) => ({ ...prev, employmentType: value as 'Permanent' | 'Contract' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-alternate-number">Alternate Number (Optional)</Label>
              <Input
                id="employee-alternate-number"
                value={employeeForm.alternateNumber}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, alternateNumber: formatWhatsAppNumber(e.target.value) }))}
                inputMode="numeric"
                maxLength={WHATSAPP_NUMBER_DIGIT_LIMIT}
                placeholder="Enter alternate number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-role">Role</Label>
              <Input
                id="employee-role"
                value={employeeForm.role}
                onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="Enter role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-location">Location</Label>
              <Select
                value={employeeForm.location}
                onValueChange={(value) => setEmployeeForm((prev) => ({ ...prev, location: value }))}
              >
                <SelectTrigger id="employee-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={closeEmployeeDialog} disabled={employeeSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEmployeeSubmit} disabled={employeeSubmitting}>
              {employeeSubmitting ? 'Saving...' : editingEmployeeId ? 'Update Employee' : 'Save Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(employeeMailTarget)} onOpenChange={(open) => (open ? undefined : closeEmployeeMailDialog())}>
        <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button_svg]:text-white">
          <DialogHeader className="bg-[#0b2a59] px-6 py-5 text-left">
            <DialogTitle className="text-xl text-white">Send Mail</DialogTitle>
            <DialogDescription className="text-sm text-white/80">
              Send a message to the selected employee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="employee-mail-to">To</Label>
              <Input id="employee-mail-to" value={employeeMailTarget?.email || ''} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-mail-subject">Subject</Label>
              <Input
                id="employee-mail-subject"
                value={employeeMailSubject}
                onChange={(e) => setEmployeeMailSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-mail-body">Message</Label>
              <Textarea
                id="employee-mail-body"
                value={employeeMailBody}
                onChange={(e) => setEmployeeMailBody(e.target.value)}
                rows={8}
                className="resize-none"
                placeholder="Enter message"
              />
            </div>
          </div>
          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button
              type="button"
              className="bg-[#0b2a59] text-white hover:bg-[#12386f]"
              onClick={handleEmployeeMailSend}
              disabled={employeeMailSending}
            >
              {employeeMailSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send
            </Button>
            <Button
              type="button"
              className="bg-[#0b2a59] text-white hover:bg-[#12386f]"
              onClick={closeEmployeeMailDialog}
              disabled={employeeMailSending}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
