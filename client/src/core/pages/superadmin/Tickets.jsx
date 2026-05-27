import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, MessageSquare, User, Calendar, Search, X } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: '', description: '', category: 'other', priority: 'medium' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/support/tickets', { params }),
        api.get('/support/tickets/stats')
      ]);
      setTickets(ticketsRes.data.data);
      setTotal(ticketsRes.data.meta?.total || 0);
      setTotalPages(ticketsRes.data.meta?.totalPages || 1);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    setCreateError('');
    if (!createForm.subject || createForm.subject.length < 5) {
      setCreateError('Subject must be at least 5 characters');
      return;
    }
    if (!createForm.description || createForm.description.length < 10) {
      setCreateError('Description must be at least 10 characters');
      return;
    }
    setCreating(true);
    try {
      await api.post('/support/tickets', createForm);
      setCreateModal(false);
      setCreateForm({ subject: '', description: '', category: 'other', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      setCreateError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const priorityColors = {
    low: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    medium: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    high: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    urgent: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
  };

  const columns = [
    {
      key: 'subject',
      label: 'Ticket',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            row.priority === 'urgent'
              ? 'bg-red-50 dark:bg-red-900/20'
              : row.priority === 'high'
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : 'bg-surface-tertiary'
          }`}>
            <MessageSquare className={`w-4 h-4 ${
              row.priority === 'urgent' ? 'text-red-600' :
              row.priority === 'high' ? 'text-amber-600' :
              'text-text-muted'
            }`} />
          </div>
          <div>
            <button
              onClick={() => navigate(`/superadmin/ticket/${row._id}`)}
              className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors text-left"
            >
              {row.subject}
            </button>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{row.description}</p>
          </div>
        </div>
      )
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (row) => row.tenant ? (
        <span className="text-sm text-text-primary">{row.tenant.businessName || '—'}</span>
      ) : (
        <span className="text-sm text-text-muted">Platform</span>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[row.priority] || priorityColors.medium}`}>
          {row.priority || 'medium'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'assignedTo',
      label: 'Assigned',
      render: (row) => row.assignedTo ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <User className="w-3 h-3 text-primary-600" />
          </div>
          <span className="text-sm text-text-primary">{row.assignedTo.name || row.assignedTo.email}</span>
        </div>
      ) : (
        <span className="text-sm text-text-muted">Unassigned</span>
      )
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-text-muted" />
          <span className="text-sm text-text-muted">{new Date(row.updatedAt).toLocaleDateString()}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Support Tickets</h1>
          <p className="text-text-muted mt-1">Manage platform support requests</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchTickets} icon={RefreshCw}>Refresh</Button>
          <Button icon={Plus} onClick={() => { setCreateForm({ subject: '', description: '', category: 'other', priority: 'medium' }); setCreateError(''); setCreateModal(true); }}>New Ticket</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Open" value={stats.open || 0} color="primary" />
          <StatCard label="In Progress" value={stats.inProgress || 0} color="amber" />
          <StatCard label="Resolved" value={stats.resolved || 0} color="emerald" />
          <StatCard label="Urgent" value={stats.urgent || 0} color="rose" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tickets..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_on_customer">Waiting on Customer</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No support tickets found."
      />

      {/* Create Ticket Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Support Ticket" size="lg">
        <div className="space-y-4">
          <Input
            label="Subject"
            value={createForm.subject}
            onChange={(e) => setCreateForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief summary of the issue"
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed description of the issue..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={createForm.category}
              onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))}
              options={[
                { value: 'billing', label: 'Billing' },
                { value: 'technical', label: 'Technical' },
                { value: 'feature_request', label: 'Feature Request' },
                { value: 'bug_report', label: 'Bug Report' },
                { value: 'account', label: 'Account' },
                { value: 'other', label: 'Other' }
              ]}
            />
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>
          {createError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400">{createError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Ticket</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
