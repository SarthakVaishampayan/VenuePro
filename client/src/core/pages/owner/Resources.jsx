import { useState, useEffect, useMemo } from 'react';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Edit2, Trash2, Wifi, WifiOff, Wrench, Crown, Headset } from 'lucide-react';
import { getBusinessLabels } from '../../services/businessLabels';

export default function Resources() {
  const { user } = useOwnerAuth();
  const labels = useMemo(() => getBusinessLabels(user?.businessType), [user?.businessType]);
  const rl = {
    singular: labels.resourceSingular,
    plural: labels.resourcePlural,
    placeholder: labels.resourcePlaceholder,
    desc: labels.resourceDesc
  };
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'standard', dayPrice: '', nightPrice: '', status: 'available', capacity: 2, notes: '' });
  const [saving, setSaving] = useState(false);
  const [tierError, setTierError] = useState(null);

  const fetchResources = async () => {
    try {
      const { data } = await ownerApi.get('/resources');
      setResources(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: 'standard', dayPrice: '', nightPrice: '', status: 'available', capacity: 2, notes: '' });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name,
      category: r.category || 'standard',
      dayPrice: String(r.dayPrice || ''),
      nightPrice: String(r.nightPrice || ''),
      status: r.status,
      capacity: r.capacity || 2,
      notes: r.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        dayPrice: parseFloat(form.dayPrice) || 0,
        nightPrice: parseFloat(form.nightPrice) || 0,
        capacity: parseInt(form.capacity) || 2,
        notes: form.notes
      };
      if (editing) {
        await ownerApi.put(`/resources/${editing._id}`, payload);
      } else {
        await ownerApi.post('/resources', payload);
      }
      setShowModal(false);
      setTierError(null);
      fetchResources();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || 'Failed to save resource';
      if (errCode === 'TIER_LIMIT_REACHED' || errCode === 'BRANCH_LIMIT_REACHED') {
        setTierError(errMsg);
        setShowModal(false);
      } else {
        alert(errMsg);
      }
    } finally { setSaving(false); }
  };

  const toggleStatus = async (r, newStatus) => {
    try {
      await ownerApi.patch(`/resources/${r._id}/status`, { status: newStatus });
      fetchResources();
    } catch (err) { alert('Failed to update status'); }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    try {
      await ownerApi.delete(`/resources/${r._id}`);
      fetchResources();
    } catch (err) { alert('Failed to delete resource'); }
  };

  if (loading) return <PageLoader />;

  const statusColors = {
    available: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    occupied: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    maintenance: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    disabled: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{rl.plural}</h1>
          <p className="text-text-muted mt-1">Manage your venue's {rl.desc} and resources</p>
        </div>
        <Button onClick={openCreate} icon={Plus}>Add {rl.singular}</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((r) => (
          <Card key={r._id} className="relative">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">{r.name}</h3>
                <p className="text-sm text-text-muted mt-0.5 capitalize">{r.category}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ''}`}>
                {r.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Day Rate</p>
                <p className="font-medium text-text-primary">₹{r.dayPrice}/hr</p>
              </div>
              <div>
                <p className="text-text-muted">Night Rate</p>
                <p className="font-medium text-text-primary">₹{r.nightPrice}/hr</p>
              </div>
              <div>
                <p className="text-text-muted">Capacity</p>
                <p className="font-medium text-text-primary">{r.capacity || 2} players</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {r.status === 'available' && (
                  <button onClick={() => toggleStatus(r, 'maintenance')} className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Set Maintenance">
                    <Wrench className="w-4 h-4" />
                  </button>
                )}
                {(r.status === 'maintenance' || r.status === 'disabled') && (
                  <button onClick={() => toggleStatus(r, 'available')} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Set Available">
                    <Wifi className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={() => openEdit(r)} className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
        {resources.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted">
            <p>No {rl.desc} yet. Click "Add {rl.singular}" to get started.</p>
          </div>
        )}
      </div>

      {/* Tier Limit Reached Modal */}
      <Modal open={!!tierError} onClose={() => setTierError(null)} title="Plan Limit Reached" size="sm">
        <div className="text-center py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            {tierError}
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="primary" icon={Headset} onClick={() => { setTierError(null); }}>
              Contact Administrator
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setTierError(null)}>
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit ${rl.singular}` : `Add ${rl.singular}`} size="md">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={rl.placeholder} required />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'premium', label: 'Premium' },
              { value: 'vip', label: 'VIP' }
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Day Price (₹/hr)" type="number" value={form.dayPrice} onChange={(e) => setForm({ ...form, dayPrice: e.target.value })} min="0" step="0.5" />
            <Input label="Night Price (₹/hr)" type="number" value={form.nightPrice} onChange={(e) => setForm({ ...form, nightPrice: e.target.value })} min="0" step="0.5" />
          </div>
          <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min="1" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.name}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
