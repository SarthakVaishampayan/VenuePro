import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Check, X as XIcon } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Card, CardHeader } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

const initialForm = {
  name: '',
  description: '',
  badge: '',
  prices: { monthly: 0, quarterly: 0, semiAnnual: 0, yearly: 0 },
  limits: { branches: 1, resources: 10, staff: 5, storage: 100, apiRequests: 1000 },
  features: [],
  sortOrder: 0,
  isActive: true
};

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subscription-plans');
      setPlans(data.data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFeatureInput('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      badge: plan.badge || '',
      prices: plan.prices || initialForm.prices,
      limits: plan.limits || initialForm.limits,
      features: plan.features || [],
      sortOrder: plan.sortOrder || 0,
      isActive: plan.isActive !== false
    });
    setFeatureInput('');
    setError('');
    setModalOpen(true);
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f) {
      const key = f.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!form.features.find(feat => feat.key === key)) {
        setForm(prev => ({ ...prev, features: [...prev.features, { key, name: f, description: '', included: true }] }));
      }
    }
    setFeatureInput('');
  };

  const removeFeature = (idx) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const toggleFeature = (idx) => {
    setForm(prev => ({ ...prev, features: prev.features.map((f, i) => i === idx ? { ...f, included: !f.included } : f) }));
  };

  // Auto-generate key from plan name
  const generateKey = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name) {
      setError('Plan name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!editing) {
        payload.key = generateKey(form.name);
      }
      if (editing) {
        await api.patch(`/subscription-plans/${editing._id}`, payload);
      } else {
        await api.post('/subscription-plans', payload);
      }
      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/subscription-plans/${id}`);
      setDeleteId(null);
      fetchPlans();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatPrice = (cents) => `₹${cents.toLocaleString()}`;

  const getFeatureDisplay = (features) => {
    if (!features || !features.length) return [];
    if (typeof features[0] === 'string') return features;
    return features.map(f => f.name || f.key);
  };

  const columns = [
    {
      key: 'name',
      label: 'Plan',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <span className="text-primary-600 text-xs font-bold">{row.name.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-primary">{row.name}</p>
              {row.badge && <Badge variant="trialing">{row.badge}</Badge>}
            </div>
            <p className="text-xs text-text-muted font-mono">{row.key}</p>
          </div>
        </div>
      )
    },
    {
      key: 'prices',
      label: 'Pricing',
      render: (row) => (
        <div className="text-sm text-text-primary">
          <p>₹{row.prices?.monthly || 0}<span className="text-text-muted text-xs">/mo</span></p>
          {row.prices?.quarterly > 0 && (
            <p className="text-xs text-text-muted">₹{row.prices.quarterly}/quarter</p>
          )}
        </div>
      )
    },
    {
      key: 'limits',
      label: 'Limits',
      render: (row) => (
        <div className="text-xs text-text-muted space-y-0.5">
          <p>{row.limits?.resources || 0} resources · {row.limits?.staff || 0} staff</p>
          <p>{row.limits?.customers || 0} customers · {row.limits?.storage || 0}MB</p>
        </div>
      )
    },
    {
      key: 'features',
      label: 'Features',
      render: (row) => (
        <div className="flex gap-1 flex-wrap max-w-[200px]">
          {getFeatureDisplay(row.features).slice(0, 3).map((f, i) => (
            <span key={i} className="px-1.5 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{f}</span>
          ))}
          {(row.features?.length || 0) > 3 && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-surface-tertiary text-text-muted">+{row.features.length - 3}</span>
          )}
        </div>
      )
    },
    {
      key: 'sortOrder',
      label: 'Order',
      sortable: true,
      render: (row) => <span className="text-sm text-text-muted">{row.sortOrder || 0}</span>
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => row.isActive !== false
        ? <Badge variant="active" dot>Active</Badge>
        : <Badge variant="disabled" dot>Disabled</Badge>
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded text-text-muted hover:text-primary-600 hover:bg-surface-tertiary transition-colors" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteId(row._id)} className="p-1.5 rounded text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subscription Plans</h1>
          <p className="text-text-muted mt-1">Manage pricing tiers, limits, and features</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchPlans} icon={RefreshCw}>Refresh</Button>
          <Button onClick={openCreate} icon={Plus}>Add Plan</Button>
        </div>
      </div>

      {/* Plan comparison cards */}
      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((plan) => (
            <Card key={plan._id} className="relative overflow-hidden" padding={false}>
              {plan.badge && (
                <div className="absolute top-3 right-3">
                  <Badge variant="trialing">{plan.badge}</Badge>
                </div>
              )}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>
                <p className="text-sm text-text-muted mt-1">{plan.description || plan.key}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-text-primary">₹{plan.prices?.monthly || 0}</span>
                  <span className="text-sm text-text-muted">/month</span>
                </div>
              </div>
              <div className="px-5 pb-5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Resources</span>
                  <span className="font-medium text-text-primary">{plan.limits?.resources || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Staff</span>
                  <span className="font-medium text-text-primary">{plan.limits?.staff || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">API Requests</span>
                  <span className="font-medium text-text-primary">{plan.limits?.apiRequests || '—'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={plans}
        loading={loading}
        emptyMessage="No subscription plans defined."
      />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Plan" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Are you sure? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Plan' : 'Add Plan'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Plan Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Turf Starter" required />
            <Input label="Tagline / Badge" value={form.badge} onChange={(e) => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Most Popular" />
          </div>
          <p className="text-xs text-text-muted -mt-2">
            Key will be auto-generated from plan name: <span className="font-mono">{form.name ? generateKey(form.name) : '—'}</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this plan" />
            <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Pricing</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Monthly (₹)" type="number" value={form.prices.monthly} onChange={(e) => setForm(f => ({ ...f, prices: { ...f.prices, monthly: parseInt(e.target.value) || 0 } }))} />
              <Input label="3 Months (₹)" type="number" value={form.prices.quarterly} onChange={(e) => setForm(f => ({ ...f, prices: { ...f.prices, quarterly: parseInt(e.target.value) || 0 } }))} />
              <Input label="6 Months (₹)" type="number" value={form.prices.semiAnnual} onChange={(e) => setForm(f => ({ ...f, prices: { ...f.prices, semiAnnual: parseInt(e.target.value) || 0 } }))} />
              <Input label="Yearly (₹)" type="number" value={form.prices.yearly} onChange={(e) => setForm(f => ({ ...f, prices: { ...f.prices, yearly: parseInt(e.target.value) || 0 } }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Limits</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Branches" type="number" value={form.limits.branches} onChange={(e) => setForm(f => ({ ...f, limits: { ...f.limits, branches: parseInt(e.target.value) || 0 } }))} />
              <Input label="Resources" type="number" value={form.limits.resources} onChange={(e) => setForm(f => ({ ...f, limits: { ...f.limits, resources: parseInt(e.target.value) || 0 } }))} />
              <Input label="Staff" type="number" value={form.limits.staff} onChange={(e) => setForm(f => ({ ...f, limits: { ...f.limits, staff: parseInt(e.target.value) || 0 } }))} />
              <Input label="Storage (MB)" type="number" value={form.limits.storage} onChange={(e) => setForm(f => ({ ...f, limits: { ...f.limits, storage: parseInt(e.target.value) || 0 } }))} />
              <Input label="API Requests" type="number" value={form.limits.apiRequests} onChange={(e) => setForm(f => ({ ...f, limits: { ...f.limits, apiRequests: parseInt(e.target.value) || 0 } }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Features</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Add a feature..."
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
              />
              <Button size="sm" onClick={addFeature}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-surface-tertiary text-text-primary">
                  <button onClick={() => toggleFeature(i)} className="text-text-muted hover:text-emerald-500">
                    {f.included ? <Check className="w-3 h-3 text-emerald-500" /> : <XIcon className="w-3 h-3 text-red-400" />}
                  </button>
                  {f.name || f.key}
                  <button onClick={() => removeFeature(i)} className="ml-0.5 text-text-muted hover:text-red-500">
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-primary">Active (visible when creating portals)</span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
