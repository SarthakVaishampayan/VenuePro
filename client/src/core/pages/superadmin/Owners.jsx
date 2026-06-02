import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Phone, Building2, Trash2, MoreHorizontal, RefreshCw, Search, ShieldOff, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export default function Owners() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [suspendModal, setSuspendModal] = useState({ open: false, tenant: null, loading: false, reason: '', error: null });
  const navigate = useNavigate();

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/tenants', { params });
      setTenants(data.data);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/tenants/${id}`);
      setDeleteModal(null);
      fetchTenants();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'businessName',
      label: 'Business',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <button
              onClick={() => navigate(`/superadmin/owner/${row._id}`)}
              className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors"
            >
              {row.businessName}
            </button>
            <p className="text-xs text-text-muted">{row.tenantCode}</p>
          </div>
        </div>
      )
    },
    {
      key: 'businessType',
      label: 'Module',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 capitalize">
            {row.businessTypeId?.name || row.businessTypeId?.key || '—'}
          </span>
        </div>
      )
    },
    {
      key: 'ownerName',
      label: 'Owner',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm text-text-primary">{row.ownerName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Mail className="w-3 h-3 text-text-muted" />
            <span className="text-xs text-text-muted">{row.ownerEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-text-muted" />
            <span className="text-xs text-text-muted">{row.ownerPhone}</span>
          </div>
        </div>
      )
    },
    {
      key: 'subscription',
      label: 'Status',
      render: (row) => <StatusBadge status={row.subscription?.status || 'inactive'} />
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (row) => {
        const plan = row.subscription?.planId;
        const planName = plan?.name || plan?.key || '';
        return (
          <span className="text-sm capitalize text-text-primary">{planName || '—'}</span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-muted">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/superadmin/owner/${row._id}`)}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            title="View details"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteModal(row)}
            className="p-1.5 rounded text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete tenant"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSuspendModal({ open: true, tenant: row, loading: false, reason: '', error: null })}
            className={`p-1.5 rounded transition-colors ${
              row.portalStatus === 'suspended'
                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : 'text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
            title={row.portalStatus === 'suspended' ? 'Unsuspend tenant' : 'Suspend tenant'}
          >
            {row.portalStatus === 'suspended' ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Owners</h1>
          <p className="text-text-muted mt-1">Manage all tenant businesses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchTenants} icon={RefreshCw}>
            Refresh
          </Button>
          <Button onClick={() => navigate('/superadmin/create-portal')} icon={Plus}>
            Create Portal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trialing">Trial</option>
          <option value="overdue">Overdue</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No tenants found. Create your first portal to get started."
      />

      {/* Suspend/Unsuspend Modal */}
      <Modal open={suspendModal.open && !!suspendModal.tenant} onClose={() => setSuspendModal({ open: false, tenant: null, loading: false, reason: '', error: null })} title={suspendModal.tenant?.portalStatus === 'suspended' ? 'Unsuspend Tenant' : 'Suspend Tenant'}>
        {suspendModal.tenant?.portalStatus === 'suspended' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This will reactivate <strong>{suspendModal.tenant?.businessName}</strong> and restore portal access.
              </p>
            </div>
            {suspendModal.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{suspendModal.error}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSuspendModal({ open: false, tenant: null, loading: false, reason: '', error: null })}>Cancel</Button>
              <Button
                loading={suspendModal.loading}
                onClick={async () => {
                  setSuspendModal(prev => ({ ...prev, loading: true, error: null }));
                  try {
                    await api.post(`/tenants/${suspendModal.tenant._id}/unsuspend`);
                    setSuspendModal({ open: false, tenant: null, loading: false, reason: '', error: null });
                    fetchTenants();
                  } catch (err) {
                    setSuspendModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Failed to reactivate' }));
                  }
                }}
                icon={ShieldCheck}
              >
                Reactivate
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>No data will be deleted.</strong> Suspend <strong>{suspendModal.tenant?.businessName}</strong>? All owner accounts will be deactivated. You can reactivate anytime.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Reason</label>
              <textarea
                value={suspendModal.reason}
                onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
                rows={2}
                placeholder="e.g., Payment overdue, policy violation"
              />
            </div>
            {suspendModal.error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{suspendModal.error}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSuspendModal({ open: false, tenant: null, loading: false, reason: '', error: null })}>Cancel</Button>
              <Button
                variant="danger"
                loading={suspendModal.loading}
                onClick={async () => {
                  setSuspendModal(prev => ({ ...prev, loading: true, error: null }));
                  try {
                    await api.post(`/tenants/${suspendModal.tenant._id}/suspend`, { reason: suspendModal.reason || undefined });
                    setSuspendModal({ open: false, tenant: null, loading: false, reason: '', error: null });
                    fetchTenants();
                  } catch (err) {
                    setSuspendModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Failed to suspend' }));
                  }
                }}
                icon={ShieldOff}
              >
                Suspend
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Tenant">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{deleteModal?.businessName}</strong>?
            This will permanently remove the tenant and all associated data.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => handleDelete(deleteModal._id)}
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
