import { useState, useEffect } from 'react';
import staffApi from '../../services/staffApi';
import { Card } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Search, Phone, Mail, ChevronDown, ChevronUp, DollarSign, AlertCircle } from 'lucide-react';

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Dues expanded per customer
  const [expandedId, setExpandedId] = useState(null);
  const [customerDues, setCustomerDues] = useState({});
  const [loadingDues, setLoadingDues] = useState({});

  // Clear Dues modal
  const [showPayDues, setShowPayDues] = useState(false);
  const [payDuesCustomer, setPayDuesCustomer] = useState(null);
  const [payDuesAmount, setPayDuesAmount] = useState('');
  const [payDuesDiscount, setPayDuesDiscount] = useState('');
  const [payDuesMode, setPayDuesMode] = useState('cash');
  const [payingDues, setPayingDues] = useState(false);
  const [payDuesError, setPayDuesError] = useState('');

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: '', nickname: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const toggleExpand = async (customerId) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    if (!customerDues[customerId]) {
      setLoadingDues(prev => ({ ...prev, [customerId]: true }));
      try {
        const { data } = await staffApi.get(`/customers/${customerId}/dues`);
        setCustomerDues(prev => ({ ...prev, [customerId]: data.data || [] }));
      } catch (err) { console.error(err); }
      finally { setLoadingDues(prev => ({ ...prev, [customerId]: false })); }
    }
  };

  const openPayDues = (customer) => {
    setPayDuesCustomer(customer);
    setPayDuesAmount('');
    setPayDuesDiscount('');
    setPayDuesMode('cash');
    setPayDuesError('');
    setShowPayDues(true);
  };

  const handlePayDues = async () => {
    if (!payDuesCustomer) return;
    setPayingDues(true);
    setPayDuesError('');
    try {
      const amount = payDuesAmount ? parseFloat(payDuesAmount) : undefined;
      const discount = payDuesDiscount ? parseFloat(payDuesDiscount) : undefined;
      await staffApi.post(`/customers/${payDuesCustomer._id}/pay-dues`, { amount, discount, mode: payDuesMode });
      setShowPayDues(false);
      setExpandedId(null);
      setCustomerDues(prev => ({ ...prev, [payDuesCustomer._id]: [] }));
      fetchCustomers();
    } catch (err) {
      setPayDuesError(err.response?.data?.error?.message || 'Failed to process payment');
    } finally { setPayingDues(false); }
  };

  const fetchCustomers = async () => {
    try {
      setError('');
      const { data } = await staffApi.get('/customers');
      setCustomers(data.data || []);
      setFiltered(data.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load players');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(customers); return; }
    const q = search.toLowerCase();
    setFiltered(customers.filter(c =>
      c.fullName?.toLowerCase().includes(q) ||
      c.nickname?.toLowerCase().includes(q) ||
      c.customerCode?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ));
  }, [search, customers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', nickname: '', phone: '', email: '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName) { setError('Full name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await staffApi.put(`/customers/${editing._id}`, form);
      } else {
        await staffApi.post('/customers', form);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save customer');
    } finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  if (error && customers.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Players</h1>
            <p className="text-text-muted mt-1">View and manage players</p>
          </div>
        </div>
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium">Failed to load players</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-2">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchCustomers(); }}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Players</h1>
          <p className="text-text-muted mt-1">View and manage players</p>
        </div>
        <Button onClick={openCreate} icon={Plus}>Add Player</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or phone..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-text-primary placeholder:text-text-muted"
        />
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const isExpanded = expandedId === c._id;
          const dues = customerDues[c._id] || [];
          const pendingDues = dues.filter(d => d.status === 'pending' || d.status === 'partial');
          const totalPending = pendingDues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

          return (
            <div key={c._id}>
              <Card hover className="cursor-pointer" onClick={() => toggleExpand(c._id)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">{c.fullName}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{c.customerCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.totalDue > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        ₹{c.totalDue}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {c.email}
                    </span>
                  )}
                </div>
                {c.nickname && <p className="text-xs text-text-muted mt-1">aka "{c.nickname}"</p>}
                {/* Wins/Losses stats */}
                {(c.wins > 0 || c.losses > 0) && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">
                      W: {c.wins}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium">
                      L: {c.losses}
                    </span>
                    {c.wins + c.losses > 0 && (
                      <span className="text-text-muted">
                        Win rate: {Math.round((c.wins / (c.wins + c.losses)) * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </Card>

              {/* Dues Section (expandable) */}
              {isExpanded && (
                <div className="mt-1 p-4 bg-surface-secondary rounded-xl border border-border animate-slideDown">
                  {loadingDues[c._id] ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : dues.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-2">No dues history for this player.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-text-primary">Dues</h4>
                        {totalPending > 0 && (
                          <Button size="sm" onClick={() => openPayDues(c)}>
                            <DollarSign className="w-3.5 h-3.5 mr-1" />
                            Clear All (₹{totalPending})
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dues.slice(0, 10).map(d => {
                          const remaining = d.amount - d.paidAmount;
                          return (
                            <div key={d._id} className="flex items-center justify-between text-sm p-2.5 bg-surface rounded-lg border border-border">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary">₹{remaining.toLocaleString()}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                                    d.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                    d.status === 'partial' ? 'bg-blue-50 text-blue-700' :
                                    d.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                    'bg-gray-50 text-gray-700'
                                  }`}>
                                    {d.status}
                                  </span>
                                </div>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {d.bookingSessionId?.resourceNameSnapshot || 'Session'} · {new Date(d.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span className="text-xs text-text-muted">
                                Paid: ₹{d.paidAmount.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                        {dues.length > 10 && (
                          <p className="text-xs text-text-muted text-center pt-1">+{dues.length - 10} more entries</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted">
            {search ? 'No customers match your search.' : 'No players yet.'}
          </div>
        )}
      </div>

      {/* Pay Dues Modal */}
      <Modal open={showPayDues} onClose={() => setShowPayDues(false)} title={`Clear Dues — ${payDuesCustomer?.fullName || ''}`} size="sm">
        {payDuesCustomer && (() => {
          // Use the already-fetched expanded dues data for accurate pending total,
          // not payDuesCustomer.totalDue which comes from getAllCustomers and may be stale
          const modalDues = customerDues[payDuesCustomer._id] || [];
          const modalPendingDues = modalDues.filter(d => d.status === 'pending' || d.status === 'partial');
          const modalTotalPending = modalPendingDues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
          const discountVal = parseFloat(payDuesDiscount) || 0;
          const effectiveTotal = Math.max(0, modalTotalPending - discountVal);

          return (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm space-y-1">
                <p className="text-amber-800 dark:text-amber-300 font-medium">
                  Pending Dues: ₹{modalTotalPending.toLocaleString()}
                </p>
                {discountVal > 0 && (
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    After Discount: <span className="font-semibold">₹{effectiveTotal.toLocaleString()}</span>
                  </p>
                )}
                <p className="text-amber-700 dark:text-amber-400 mt-1 text-xs">
                  Enter an amount to pay. Leave empty to clear all pending dues.
                </p>
              </div>
              <Input
                label={`Amount (leave empty for full payment of ₹${effectiveTotal.toLocaleString()})`}
                type="number"
                value={payDuesAmount}
                onChange={(e) => {
                  setPayDuesAmount(e.target.value);
                  // If entering a partial amount, clear any discount (discount only for full payment)
                  if (e.target.value && parseFloat(e.target.value) < modalTotalPending) {
                    setPayDuesDiscount('');
                  }
                }}
                min="0"
                max={effectiveTotal || 0}
                step="0.5"
              />
              {(!payDuesAmount || parseFloat(payDuesAmount) >= modalTotalPending) && (
                <Input
                  label="Discount (₹) — optional (only for full payment)"
                  type="number"
                  value={payDuesDiscount}
                  onChange={(e) => setPayDuesDiscount(e.target.value)}
                  min="0"
                  max={modalTotalPending}
                  step="1"
                />
              )}
              <Select
                label="Payment Mode"
                value={payDuesMode}
                onChange={(e) => setPayDuesMode(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'online', label: 'Online (UPI/Card)' }
                ]}
              />
              {payDuesError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">{payDuesError}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowPayDues(false)}>Cancel</Button>
                <Button onClick={handlePayDues} loading={payingDues}>
                  <DollarSign className="w-4 h-4" />
                  {discountVal > 0
                    ? `Pay ₹${(parseFloat(payDuesAmount) || effectiveTotal).toLocaleString()} (₹${discountVal} off)`
                    : `Pay ₹${(parseFloat(payDuesAmount) || effectiveTotal).toLocaleString()}`}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Player' : 'Add Player'} size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Nickname / Alias" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Optional" />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.fullName}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
