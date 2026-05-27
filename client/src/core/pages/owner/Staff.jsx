import { useState, useEffect, useMemo } from 'react';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Edit2, Trash2, DollarSign, Users, BadgeDollarSign, Key, Eye, EyeOff, Building2, Calendar, Clock, CheckCircle } from 'lucide-react';
import { getBusinessLabels } from '../../services/businessLabels';

const roleOptions = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'cashier', label: 'Cashier' }
];

export default function Staff() {
  const { user } = useOwnerAuth();
  const sl = useMemo(() => {
    const labels = getBusinessLabels(user?.businessType);
    return { resource: labels.staffResource, customer: labels.staffCustomer };
  }, [user?.businessType]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('true');
  const [branchFilter, setBranchFilter] = useState('all');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', role: 'staff', branchId: '',
    monthlySalary: '', permissions: {}, hasPortalAccess: false, password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Salary payment modal
  const [showSalary, setShowSalary] = useState(false);
  const [salaryStaff, setSalaryStaff] = useState(null);
  const [salaryType, setSalaryType] = useState('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [paying, setPaying] = useState(false);

  // Shift modal
  const [showShift, setShowShift] = useState(false);
  const [shiftStaff, setShiftStaff] = useState(null);
  const [shiftForm, setShiftForm] = useState({ date: '', startTime: '', endTime: '', branchId: '' });
  const [savingShift, setSavingShift] = useState(false);

  // Today's shifts
  const [todayShifts, setTodayShifts] = useState([]);
  const [showShifts, setShowShifts] = useState(false);

  const fetchStaff = async () => {
    try {
      const { data } = await ownerApi.get(`/staff?active=${activeFilter}`);
      setStaff(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await ownerApi.get('/staff/analytics');
      setAnalytics(data.data);
    } catch (err) { console.error(err); }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await ownerApi.get('/branches');
      setBranches(data.data || []);
    } catch (err) { /* branches may not exist yet */ }
  };

  const fetchTodayShifts = async () => {
    try {
      const { data } = await ownerApi.get('/staff/shifts/today');
      setTodayShifts(data.data || []);
    } catch (err) { /* shifts may not exist yet */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchAnalytics(), fetchBranches(), fetchTodayShifts()])
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const filteredStaff = useMemo(() => {
    if (branchFilter === 'all') return staff;
    return staff.filter(s => s.branchId === branchFilter || (s.branchId && s.branchId._id === branchFilter));
  }, [staff, branchFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', phone: '', email: '', role: 'staff', branchId: branches.length === 1 ? branches[0]._id : '',
      monthlySalary: '', permissions: {}, hasPortalAccess: false, password: ''
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone,
      email: s.email || '',
      role: s.role,
      branchId: s.branchId?._id || s.branchId || '',
      monthlySalary: String(s.monthlySalary || ''),
      permissions: s.permissions || {},
      hasPortalAccess: s.hasPortalAccess || false,
      password: ''
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return;
    if (form.hasPortalAccess && !form.password && (!editing || !editing.hasPortalAccess)) {
      alert('Please set a password for portal access.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name, phone: form.phone, email: form.email || undefined,
        role: form.role, branchId: form.branchId || undefined,
        monthlySalary: parseFloat(form.monthlySalary) || 0,
        permissions: form.permissions, hasPortalAccess: form.hasPortalAccess,
        ...(form.hasPortalAccess && form.password ? { password: form.password } : {})
      };
      if (editing) {
        await ownerApi.put(`/staff/${editing._id}`, payload);
      } else {
        await ownerApi.post('/staff', payload);
      }
      setShowModal(false);
      fetchStaff();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save staff');
    } finally { setSaving(false); }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete staff member "${s.name}"?`)) return;
    try {
      await ownerApi.delete(`/staff/${s._id}`);
      fetchStaff();
      fetchAnalytics();
    } catch (err) { alert('Failed to delete staff'); }
  };

  const openPaySalary = (s) => {
    setSalaryStaff(s);
    setSalaryType('full');
    setPartialAmount('');
    setShowSalary(true);
  };

  const handlePaySalary = async () => {
    if (!salaryStaff) return;
    setPaying(true);
    try {
      const payload = { type: salaryType };
      if (salaryType === 'partial') payload.amount = parseFloat(partialAmount);
      await ownerApi.post(`/staff/${salaryStaff._id}/pay`, payload);
      setShowSalary(false);
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to pay salary');
    } finally { setPaying(false); }
  };

  const openShiftModal = (s) => {
    setShiftStaff(s);
    setShiftForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      branchId: s.branchId?._id || s.branchId || ''
    });
    setShowShift(true);
  };

  const handleCreateShift = async () => {
    if (!shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) return;
    setSavingShift(true);
    try {
      await ownerApi.post('/staff/shifts', {
        staffId: shiftStaff._id,
        date: shiftForm.date,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        branchId: shiftForm.branchId || undefined
      });
      setShowShift(false);
      fetchTodayShifts();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create shift');
    } finally { setSavingShift(false); }
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
    }));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Staff</h1>
          <p className="text-text-muted mt-1">Manage staff members, roles, salaries, and shifts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowShifts(!showShifts)} icon={Calendar}>
            Today's Shifts ({todayShifts.length})
          </Button>
          <Button onClick={openCreate} icon={Plus}>Add Staff</Button>
        </div>
      </div>

      {/* Today's Shifts Panel */}
      {showShifts && (
        <Card>
          <CardHeader title="Today's Shifts" subtitle={`${todayShifts.length} shifts scheduled`} />
          {todayShifts.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No shifts scheduled for today.</p>
          ) : (
            <div className="divide-y divide-border">
              {todayShifts.map((shift) => (
                <div key={shift._id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      shift.status === 'checked_in' ? 'bg-emerald-500' :
                      shift.status === 'checked_out' ? 'bg-gray-400' :
                      shift.status === 'scheduled' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {shift.staffId?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {shift.startTime} - {shift.endTime}
                        {shift.branchId && ` · ${shift.branchId.name || ''}`}
                        <span className={`ml-1 capitalize ${
                          shift.status === 'checked_in' ? 'text-emerald-600' :
                          shift.status === 'checked_out' ? 'text-gray-500' :
                          shift.status === 'scheduled' ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {shift.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                  </div>
                  {shift.status === 'scheduled' && (
                    <span className="text-xs text-text-muted">{shift.staffId?.role || ''}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Active Staff</p>
                <p className="text-xl font-bold text-text-primary">{analytics.totalStaff}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Monthly Salary Budget</p>
                <p className="text-xl font-bold text-text-primary">₹{analytics.totalMonthlySalary?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Paid This Month</p>
                <p className="text-xl font-bold text-text-primary">₹{analytics.thisMonth?.total?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {['true', 'false', 'all'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                activeFilter === v ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
              }`}
            >
              {v === 'true' ? 'Active' : v === 'false' ? 'Inactive' : 'All'}
            </button>
          ))}
        </div>
        {branches.length > 0 && (
          <div className="w-48">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((s) => (
          <Card key={s._id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">{s.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-muted capitalize">{s.role}</span>
                  {s.branchId && typeof s.branchId === 'object' && (
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {s.branchId.name}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {s.phone && <p className="text-text-muted">📞 {s.phone}</p>}
              {s.email && <p className="text-text-muted">✉️ {s.email}</p>}
              <p className="font-medium text-text-primary">Salary: ₹{s.monthlySalary?.toLocaleString()}/mo</p>
              {s.hasPortalAccess && <p className="text-xs text-emerald-600">🔑 Portal access granted</p>}
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => openPaySalary(s)} disabled={!s.isActive}>
                <DollarSign className="w-4 h-4" /> Pay
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openShiftModal(s)} disabled={!s.isActive}>
                <Clock className="w-4 h-4" /> Shift
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          </Card>
        ))}
        {filteredStaff.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted">
            {staff.length === 0 ? 'No staff members yet.' : 'No staff match the selected filters.'}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Staff' : 'Add Staff'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={roleOptions} />
          </div>
          {branches.length > 0 && (
            <Select
              label="Branch Assignment"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              options={[
                { value: '', label: 'No branch (HQ)' },
                ...branches.map(b => ({ value: b._id, label: b.name }))
              ]}
            />
          )}
          <Input label="Monthly Salary (₹)" type="number" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} min="0" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Permissions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'canManageResources', label: `Manage ${sl.resource}` },
                { key: 'canManageSessions', label: 'Manage Sessions' },
                { key: 'canManagePayments', label: 'Manage Payments' },
                { key: 'canManageCustomers', label: `Manage ${sl.customer}` },
                { key: 'canManageStaff', label: 'Manage Staff' },
                { key: 'canViewReports', label: 'View Reports' },
                { key: 'canManageExpenses', label: 'Manage Expenses' },
                { key: 'canManageDues', label: 'Manage Dues' }
              ].map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input type="checkbox" checked={form.permissions[perm.key] || false} onChange={() => togglePermission(perm.key)} className="rounded border-border text-emerald-600 focus:ring-emerald-500" />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="portalAccess" checked={form.hasPortalAccess} onChange={(e) => setForm({ ...form, hasPortalAccess: e.target.checked, password: e.target.checked ? form.password : '' })} className="rounded border-border text-emerald-600 focus:ring-emerald-500" />
            <label htmlFor="portalAccess" className="text-sm text-text-primary">Grant portal access</label>
          </div>

          {form.hasPortalAccess && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                <Key className="w-3.5 h-3.5 inline mr-1" />
                Portal Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? 'Leave blank to keep current password' : 'Set a password for staff login'}
                  required={!editing}
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-text-muted text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name || !form.phone}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Salary Payment Modal */}
      <Modal open={showSalary} onClose={() => setShowSalary(false)} title="Pay Salary" size="sm">
        {salaryStaff && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-secondary rounded-lg text-sm">
              <p className="font-medium text-text-primary">{salaryStaff.name}</p>
              <p className="text-text-muted">Salary: ₹{salaryStaff.monthlySalary?.toLocaleString()}/mo</p>
            </div>
            <Select
              label="Payment Type"
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value)}
              options={[
                { value: 'full', label: `Full Salary (₹${salaryStaff.monthlySalary})` },
                { value: 'half', label: `Half Salary (₹${Math.round(salaryStaff.monthlySalary / 2)})` },
                { value: 'partial', label: 'Partial Amount' }
              ]}
            />
            {salaryType === 'partial' && (
              <Input label="Amount (₹)" type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} min="0" max={salaryStaff.monthlySalary} step="0.5" required />
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowSalary(false)}>Cancel</Button>
              <Button onClick={handlePaySalary} loading={paying}>
                <DollarSign className="w-4 h-4" />
                Pay ₹{salaryType === 'full' ? salaryStaff.monthlySalary : salaryType === 'half' ? Math.round(salaryStaff.monthlySalary / 2) : partialAmount || '...'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Shift Modal */}
      <Modal open={showShift} onClose={() => setShowShift(false)} title="Schedule Shift" size="sm">
        {shiftStaff && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-secondary rounded-lg text-sm">
              <p className="font-medium text-text-primary">{shiftStaff.name}</p>
              <p className="text-text-muted capitalize">{shiftStaff.role}</p>
            </div>
            <Input label="Date" type="date" value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Time" type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} required />
              <Input label="End Time" type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} required />
            </div>
            {branches.length > 0 && (
              <Select
                label="Branch"
                value={shiftForm.branchId}
                onChange={(e) => setShiftForm({ ...shiftForm, branchId: e.target.value })}
                options={[
                  { value: '', label: 'Default' },
                  ...branches.map(b => ({ value: b._id, label: b.name }))
                ]}
              />
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowShift(false)}>Cancel</Button>
              <Button onClick={handleCreateShift} loading={savingShift} icon={Calendar}>Schedule</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
