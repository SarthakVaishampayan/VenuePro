import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, GripVertical } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Card, CardHeader } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

const initialForm = {
  name: '',
  key: '',
  description: '',
  labels: { resourceSingular: 'Table', resourcePlural: 'Tables', bookingSingular: 'Session', bookingPlural: 'Sessions', customerSingular: 'Player', customerPlural: 'Players' },
  bookingMode: 'session',
  pricingStrategy: 'time_based',
  enabledModules: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers'],
  icon: 'Building2'
};

export default function BusinessTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/business-types');
      setTypes(data.data);
    } catch (err) {
      console.error('Failed to load business types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (type) => {
    setEditing(type);
    setForm({
      name: type.name,
      key: type.key,
      description: type.description || '',
      labels: type.labels || initialForm.labels,
      bookingMode: type.bookingMode || 'session',
      pricingStrategy: type.pricingStrategy || 'time_based',
      enabledModules: type.enabledModules || initialForm.enabledModules,
      icon: type.icon || 'Building2'
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.key) {
      setError('Name and key are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/business-types/${editing._id}`, form);
      } else {
        await api.post('/business-types', form);
      }
      setModalOpen(false);
      fetchTypes();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/business-types/${id}`);
      setDeleteId(null);
      fetchTypes();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Business Type',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <span className="text-primary-600 text-xs font-bold">{row.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{row.name}</p>
            <p className="text-xs text-text-muted font-mono">{row.key}</p>
          </div>
        </div>
      )
    },
    {
      key: 'bookingMode',
      label: 'Booking Mode',
      render: (row) => <Badge variant={row.bookingMode === 'per-slot' ? 'active' : 'trialing'}>{row.bookingMode}</Badge>
    },
    {
      key: 'pricingStrategy',
      label: 'Pricing',
      render: (row) => <span className="text-sm text-text-primary capitalize">{row.pricingStrategy?.replace(/-/g, ' ')}</span>
    },
    {
      key: 'modules',
      label: 'Modules',
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {(row.enabledModules || []).map((key) => (
            <span key={key} className="px-1.5 py-0.5 text-xs rounded bg-surface-tertiary text-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (row) => <span className="text-sm text-text-muted">{new Date(row.createdAt).toLocaleDateString()}</span>
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
          <h1 className="text-2xl font-bold text-text-primary">Business Types</h1>
          <p className="text-text-muted mt-1">Configure supported business types for tenant portals</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchTypes} icon={RefreshCw}>Refresh</Button>
          <Button onClick={openCreate} icon={Plus}>Add Type</Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={types}
        loading={loading}
        emptyMessage="No business types defined yet."
      />

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Business Type" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Are you sure? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Business Type' : 'Add Business Type'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cricket / Football Turf" required />
            <Input label="Key" value={form.key} onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))} placeholder="cricket_football" required disabled={!!editing} />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this business type" />
          
          <div className="grid grid-cols-2 gap-4">              <Input label="Resource (Singular)" value={form.labels.resourceSingular} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, resourceSingular: e.target.value } }))} placeholder="Table" />
            <Input label="Resource (Plural)" value={form.labels.resourcePlural} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, resourcePlural: e.target.value } }))} placeholder="Tables" />
            <Input label="Booking (Singular)" value={form.labels.bookingSingular} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, bookingSingular: e.target.value } }))} placeholder="Session" />
            <Input label="Booking (Plural)" value={form.labels.bookingPlural} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, bookingPlural: e.target.value } }))} placeholder="Sessions" />
            <Input label="Customer (Singular)" value={form.labels.customerSingular} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, customerSingular: e.target.value } }))} placeholder="Player" />
            <Input label="Customer (Plural)" value={form.labels.customerPlural} onChange={(e) => setForm(f => ({ ...f, labels: { ...f.labels, customerPlural: e.target.value } }))} placeholder="Players" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Booking Mode" value={form.bookingMode} onChange={(e) => setForm(f => ({ ...f, bookingMode: e.target.value }))} options={[
              { value: 'session', label: 'Session (Timer-based)' },
              { value: 'slot', label: 'Slot (Pre-scheduled)' },
              { value: 'configurable', label: 'Configurable' }
            ]} />
            <Select label="Pricing Strategy" value={form.pricingStrategy} onChange={(e) => setForm(f => ({ ...f, pricingStrategy: e.target.value }))} options={[
              { value: 'time_based', label: 'Time Based (Per minute/hour)' },
              { value: 'slot_based', label: 'Slot Based (Per session)' },
              { value: 'configurable', label: 'Configurable' }
            ]} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Enabled Modules</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers', 'booking_portal'].map((key) => (
                <label key={key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabledModules.includes(key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(f => ({ ...f, enabledModules: [...f.enabledModules, key] }));
                      } else {
                        setForm(f => ({ ...f, enabledModules: f.enabledModules.filter(k => k !== key) }));
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-text-primary capitalize">{key.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

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
