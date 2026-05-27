import { useState, useEffect } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { PageLoader } from '../../components/common/Loader';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Clock, Users, Table2, Activity, ExternalLink } from 'lucide-react';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '',
    contactPhone: '', operatingHours: { open: '09:00', close: '23:00' }
  });

  const fetchBranches = async () => {
    try {
      const { data } = await ownerApi.get('/branches');
      setBranches(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBranches(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', address: '', city: '', state: '', contactPhone: '', operatingHours: { open: '09:00', close: '23:00' } });
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name, code: b.code || '', address: b.address || '', city: b.city || '', state: b.state || '',
      contactPhone: b.contactPhone || '', operatingHours: b.operatingHours || { open: '09:00', close: '23:00' }
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name, code: form.code || undefined,
        address: form.address || undefined, city: form.city || undefined,
        state: form.state || undefined, contactPhone: form.contactPhone || undefined,
        operatingHours: form.operatingHours
      };
      if (editing) {
        await ownerApi.put(`/branches/${editing._id}`, payload);
      } else {
        await ownerApi.post('/branches', payload);
      }
      setShowModal(false);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save branch');
    } finally { setSaving(false); }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete branch "${b.name}"? This action cannot be undone.`)) return;
    try {
      await ownerApi.delete(`/branches/${b._id}`);
      fetchBranches();
    } catch (err) { alert('Failed to delete branch'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Branches</h1>
          <p className="text-text-muted mt-1">Manage multiple venue locations</p>
        </div>
        <Button onClick={openCreate} icon={Plus}>Add Branch</Button>
      </div>

      {branches.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium text-text-primary mb-1">No branches yet</h3>
            <p className="text-sm text-text-muted mb-4">Create your first branch to start managing multiple locations</p>
            <Button onClick={openCreate} icon={Plus}>Create Branch</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b._id} className="relative">
              {!b.isActive && (
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs font-medium rounded-full">Inactive</span>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2.5 rounded-lg ${b.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">{b.name}</h3>
                  {b.code && <p className="text-xs text-text-muted font-mono">{b.code}</p>}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {(b.city || b.state) && (
                  <p className="flex items-center gap-1.5 text-text-muted">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {[b.city, b.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {b.contactPhone && (
                  <p className="flex items-center gap-1.5 text-text-muted">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {b.contactPhone}
                  </p>
                )}
                {b.operatingHours && (
                  <p className="flex items-center gap-1.5 text-text-muted">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {b.operatingHours.open} - {b.operatingHours.close}
                  </p>
                )}
              </div>

              {/* Stats */}
              {b.stats && (
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">{b.stats.activeSessions || 0}</p>
                    <p className="text-xs text-text-muted">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">{b.stats.staffCount || 0}</p>
                    <p className="text-xs text-text-muted">Staff</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">{b.stats.resourceCount || 0}</p>
                    <p className="text-xs text-text-muted">Resources</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="secondary" size="sm" onClick={() => openEdit(b)}>
                  <Edit2 className="w-4 h-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(b)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Branch' : 'Add Branch'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Downtown Arena" />
            <Input label="Branch Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DTA" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="New York" />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="NY" />
          </div>
          <Input label="Contact Phone" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+1 555-0000" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Opening Time" type="time" value={form.operatingHours.open} onChange={(e) => setForm({ ...form, operatingHours: { ...form.operatingHours, open: e.target.value } })} />
            <Input label="Closing Time" type="time" value={form.operatingHours.close} onChange={(e) => setForm({ ...form, operatingHours: { ...form.operatingHours, close: e.target.value } })} />
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
