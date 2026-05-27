import { useState, useEffect } from 'react';
import staffApi from '../../services/staffApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Search } from 'lucide-react';

export default function StaffPayments() {
  const [payments, setPayments] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Record payment modal
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    try {
      const { data } = await staffApi.get('/payments?limit=20');
      setPayments(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDailySummary = async () => {
    try {
      const { data } = await staffApi.get('/payments/daily-summary');
      setDailySummary(data.data);
    } catch {}
  };

  useEffect(() => {
    Promise.all([fetchPayments(), fetchDailySummary()]);
  }, []);

  const openRecord = async () => {
    setShowModal(true);
    setSelectedCustomer('');
    setCustomerSearch('');
    setAmount('');
    setMode('cash');
    setNotes('');
    setError('');
    setCustomerResults([]);
    try {
      const { data } = await staffApi.get('/customers');
      setCustomers(data.data || []);
    } catch {}
  };

  const handleCustomerSearch = (q) => {
    setCustomerSearch(q);
    if (q.length < 1) { setCustomerResults([]); return; }
    const results = customers.filter(c =>
      c.fullName?.toLowerCase().includes(q.toLowerCase()) ||
      c.phone?.includes(q) ||
      c.customerCode?.toLowerCase().includes(q.toLowerCase())
    );
    setCustomerResults(results.slice(0, 10));
  };

  const handleSave = async () => {
    if (!selectedCustomer || !amount) { setError('Customer and amount are required'); return; }
    setSaving(true);
    setError('');
    try {
      await staffApi.post('/payments', {
        customerId: selectedCustomer,
        amount: parseFloat(amount),
        mode,
        notes
      });
      setShowModal(false);
      fetchPayments();
      fetchDailySummary();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
          <p className="text-text-muted mt-1">Record and view payments</p>
        </div>
        <Button onClick={openRecord} icon={Plus}>Record Payment</Button>
      </div>

      {/* Daily Summary */}
      {dailySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-text-muted">Today's Total</p>
            <p className="text-2xl font-bold text-text-primary">₹{dailySummary.total?.toLocaleString()}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-muted">Transactions</p>
            <p className="text-2xl font-bold text-text-primary">{dailySummary.count}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-muted">By Mode</p>
            <div className="mt-1 space-y-1">
              {Object.entries(dailySummary.byMode || {}).map(([m, amt]) => (
                <p key={m} className="text-sm text-text-primary capitalize">
                  {m}: ₹{amt.toLocaleString()}
                </p>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Payments List */}
      <Card>
        <CardHeader title="Recent Payments" subtitle="Latest 20 transactions" />
        {payments.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Customer</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Mode</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary">{p.customerId?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">₹{p.amount}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-sm text-text-primary">{p.mode}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Payment Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="Search customer..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-text-primary"
              />
            </div>
            {customerResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => {
                      setSelectedCustomer(c._id);
                      setCustomerSearch(`${c.fullName} (${c.phone || c.customerCode})`);
                      setCustomerResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary transition-colors"
                  >
                    {c.fullName} — <span className="text-text-muted">{c.customerCode}{c.phone ? ` | ${c.phone}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.5" required />
          <Select
            label="Payment Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'online', label: 'Online (UPI/Card)' }
            ]}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-text-primary"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!selectedCustomer || !amount}>
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
