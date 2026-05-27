import { useState, useEffect } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Edit2, Trash2, TrendingDown, DollarSign, PieChart } from 'lucide-react';

const categoryOptions = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'salary', label: 'Salary' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'other', label: 'Other' }
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ description: '', amount: '', category: 'misc', date: new Date().toISOString().split('T')[0], paymentMode: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    try {
      const params = categoryFilter ? `?category=${categoryFilter}` : '';
      const { data } = await ownerApi.get(`/expenses${params}`);
      setExpenses(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await ownerApi.get('/expenses/analytics');
      setAnalytics(data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchExpenses(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ description: '', amount: '', category: 'misc', date: new Date().toISOString().split('T')[0], paymentMode: 'cash', notes: '' });
    setShowModal(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      date: new Date(e.date).toISOString().split('T')[0],
      paymentMode: e.paymentMode || 'cash',
      notes: e.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
        paymentMode: form.paymentMode,
        notes: form.notes
      };
      if (editing) {
        await ownerApi.put(`/expenses/${editing._id}`, payload);
      } else {
        await ownerApi.post('/expenses', payload);
      }
      setShowModal(false);
      fetchExpenses();
      fetchAnalytics();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  };

  const handleDelete = async (e) => {
    if (!confirm(`Delete expense "${e.description}" (₹${e.amount})?`)) return;
    try {
      await ownerApi.delete(`/expenses/${e._id}`);
      fetchExpenses();
      fetchAnalytics();
    } catch (err) { alert('Failed to delete expense'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Expenses</h1>
          <p className="text-text-muted mt-1">Track and manage your expenses</p>
        </div>
        <Button onClick={openCreate} icon={Plus}>Add Expense</Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Total Expenses</p>
                <p className="text-xl font-bold text-text-primary">₹{analytics.totalExpenses?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Today</p>
                <p className="text-xl font-bold text-text-primary">₹{analytics.todayExpenses?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Categories</p>
                <p className="text-xl font-bold text-text-primary">{Object.keys(analytics.categoryBreakdown || {}).length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category breakdown */}
      {analytics?.categoryBreakdown && Object.keys(analytics.categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader title="Category Breakdown" subtitle="Total by category" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(analytics.categoryBreakdown).map(([cat, val]) => (
              <div key={cat} className="p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-text-primary capitalize">{cat}</p>
                <p className="text-lg font-bold text-text-primary">₹{val.total.toLocaleString()}</p>
                <p className="text-xs text-text-muted">{val.count} entries</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            !categoryFilter ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
          }`}
        >
          All
        </button>
        {categoryOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => setCategoryFilter(categoryFilter === o.value ? '' : o.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
              categoryFilter === o.value ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader title="All Expenses" subtitle={`${expenses.length} entries`} />
        {expenses.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">No expenses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Description</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Category</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Mode</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">By</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary">{e.description}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-tertiary text-text-primary capitalize">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">₹{e.amount}</td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{e.paymentMode}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{e.createdBy || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="md">
        <div className="space-y-4">
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="0" step="0.5" required />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={categoryOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select
              label="Payment Mode"
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'online', label: 'Online (UPI/Card)' }
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary" rows={2} placeholder="Optional..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.description || !form.amount}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
