import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar, CreditCard,
  DollarSign, AlertTriangle, RefreshCw, Copy, Check, ShieldOff, ShieldCheck, Trash2
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import RecordPaymentModal from '../../components/common/RecordPaymentModal';

export default function OwnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState({ open: false, loading: false, result: null, error: null });
  const [copied, setCopied] = useState(false);
  const [suspendModal, setSuspendModal] = useState({ open: false, loading: false, reason: '', error: null });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenantRes, statsRes] = await Promise.all([
          api.get(`/tenants/${id}`),
          api.get(`/tenants/${id}/stats`)
        ]);
        setTenant(tenantRes.data.data);
        setStats(statsRes.data.data);
      } catch (err) {
        console.error('Failed to load tenant:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleResetPassword = async () => {
    setResetModal({ open: true, loading: true, result: null, error: null });
    try {
      const res = await api.post(`/tenants/${id}/reset-password`);
      setResetModal({ open: true, loading: false, result: res.data.data, error: null });
    } catch (err) {
      setResetModal({ open: true, loading: false, result: null, error: err.response?.data?.message || 'Failed to reset password' });
    }
  };

  const handleCopyPassword = () => {
    if (resetModal.result?.tempPassword) {
      navigator.clipboard.writeText(resetModal.result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSuspend = async () => {
    setSuspendModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      await api.post(`/tenants/${id}/suspend`, { reason: suspendModal.reason || undefined });
      setSuspendModal({ open: false, loading: false, reason: '', error: null });
      // Refresh tenant data
      const [tenantRes, statsRes] = await Promise.all([
        api.get(`/tenants/${id}`),
        api.get(`/tenants/${id}/stats`)
      ]);
      setTenant(tenantRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      setSuspendModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Failed to suspend tenant' }));
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      await api.delete(`/tenants/${id}`);
      navigate('/superadmin/owners');
    } catch (err) {
      setDeleteModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Failed to delete tenant' }));
    }
  };

  // Unsuspend is handled inline in the modal's unsuspend section

  if (loading) return <PageLoader />;
  if (!tenant) return <p className="text-text-muted">Tenant not found.</p>;

  const sub = tenant.currentSubscription;
  const currency = tenant.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/superadmin/owners')} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{tenant.businessName}</h1>
            <StatusBadge status={sub?.status || 'inactive'} />
          </div>
          <p className="text-text-muted">Owner: {tenant.ownerName} · Code: {tenant.tenantCode}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <CreditCard className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Plan</p>
              <p className="text-sm font-medium text-text-primary capitalize">{sub?.planSnapshot?.key || '—'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Fee ({sub?.billingCycle || 'monthly'})</p>
              <p className="text-sm font-medium text-text-primary">{currency}{sub?.amount || 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Next Billing</p>
              <p className="text-sm font-medium text-text-primary">
                {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
              <DollarSign className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Revenue</p>
              <p className="text-sm font-medium text-text-primary">{currency}{stats?.totalRevenue || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Owner Info + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Owner Information" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{tenant.ownerName}</p>
                <p className="text-xs text-text-muted">Owner</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-primary">{tenant.ownerEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-primary">{tenant.ownerPhone}</span>
            </div>
            {(tenant.address?.city || tenant.address?.state) && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-primary">
                  {[tenant.address?.city, tenant.address?.state, tenant.address?.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-text-muted mb-1">Tenant Code</p>
              <p className="text-sm font-mono text-text-primary">{tenant.tenantCode}</p>
              <p className="text-xs text-text-muted mt-2">Timezone: {tenant.timezone} · Currency: {tenant.currency}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription Details" />
          <div className="space-y-3">
            {sub?.status === 'trialing' ? (
              <>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Plan</span>
                  <span className="text-sm font-medium text-text-primary capitalize">{sub?.planSnapshot?.key || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Status</span>
                  <StatusBadge status="trialing" />
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Trial Started</span>
                  <span className="text-sm font-medium text-text-primary">
                    {sub?.trialStartDate ? new Date(sub.trialStartDate).toLocaleDateString() : (sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Trial Ends</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {sub?.trialEndDate ? new Date(sub.trialEndDate).toLocaleDateString() : (sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—')}
                    </span>
                    {(() => {
                      const endDate = sub?.trialEndDate || sub?.currentPeriodEnd;
                      if (endDate) {
                        const daysLeft = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            daysLeft <= 3
                              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              : daysLeft <= 15
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          }`}>
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-text-muted">Invoices</span>
                  <span className="text-sm font-medium text-text-primary">{stats?.invoices?.total || 0} ({stats?.invoices?.paid || 0} paid)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Plan</span>
                  <span className="text-sm font-medium text-text-primary capitalize">{sub?.planSnapshot?.key || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Billing Cycle</span>
                  <span className="text-sm font-medium text-text-primary capitalize">{sub?.billingCycle || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Amount</span>
                  <span className="text-sm font-medium text-text-primary">{currency}{sub?.amount || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">Start Date</span>
                  <span className="text-sm font-medium text-text-primary">
                    {sub?.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-muted">End Date</span>
                  <span className="text-sm font-medium text-text-primary">
                    {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-text-muted">Invoices</span>
                  <span className="text-sm font-medium text-text-primary">{stats?.invoices?.total || 0} ({stats?.invoices?.paid || 0} paid)</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader title="Actions" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={RefreshCw} onClick={handleResetPassword} loading={resetModal.loading && resetModal.open}>Reset Password</Button>
          {sub?.status === 'trialing' && (
            <Button variant="primary" icon={CreditCard} onClick={() => setPaymentModalOpen(true)}>
              Convert to Paid Plan
            </Button>
          )}
          {tenant.portalStatus === 'suspended' ? (
            <Button variant="secondary" icon={ShieldCheck} onClick={() => setSuspendModal({ open: true, loading: false, reason: '', error: null })}>
              Unsuspend Tenant
            </Button>
          ) : (
            <Button variant="danger" icon={ShieldOff} onClick={() => setSuspendModal({ open: true, loading: false, reason: '', error: null })}>
              Suspend Tenant
            </Button>
          )}
          {sub?.status !== 'trialing' && (
            <Button variant="secondary" icon={DollarSign} onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>
          )}
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal({ open: true, loading: false, error: null })}>
            Permanently Delete Tenant
          </Button>
        </div>
      </Card>

      {/* Suspend Tenant Modal */}
      <Modal
        open={suspendModal.open}
        onClose={() => setSuspendModal({ open: false, loading: false, reason: '', error: null })}
        title={tenant.portalStatus === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant'}
      >
        <div className="space-y-4 py-2">
          {tenant.portalStatus === 'suspended' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This will reactivate <strong>{tenant.businessName}</strong> and restore portal access for all users.
                </p>
              </div>
              {suspendModal.error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                  <p className="text-sm text-red-700 dark:text-red-400">{suspendModal.error}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setSuspendModal({ open: false, loading: false, reason: '', error: null })}>Cancel</Button>
                <Button
                  loading={suspendModal.loading}
                  icon={ShieldCheck}
                  onClick={async () => {
                    setSuspendModal(prev => ({ ...prev, loading: true, error: null }));
                    try {
                      await api.post(`/tenants/${id}/unsuspend`);
                      setSuspendModal({ open: false, loading: false, reason: '', error: null });
                      const [tenantRes, statsRes] = await Promise.all([
                        api.get(`/tenants/${id}`),
                        api.get(`/tenants/${id}/stats`)
                      ]);
                      setTenant(tenantRes.data.data);
                      setStats(statsRes.data.data);
                    } catch (err) {
                      setSuspendModal(prev => ({ ...prev, loading: false, error: err.response?.data?.message || 'Failed to reactivate tenant' }));
                    }
                  }}
                >
                  Reactivate Tenant
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>No data will be deleted.</strong> The tenant's portal access will be suspended and all owner accounts will be deactivated. You can reactivate anytime.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Reason for suspension</label>
                <textarea
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
                  rows={2}
                  placeholder="e.g., Payment overdue, policy violation, etc."
                />
              </div>
              {suspendModal.error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                  <p className="text-sm text-red-700 dark:text-red-400">{suspendModal.error}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setSuspendModal({ open: false, loading: false, reason: '', error: null })}>Cancel</Button>
                <Button variant="danger" onClick={handleSuspend} loading={suspendModal.loading} icon={ShieldOff}>
                  Confirm Suspension
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Tenant Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, loading: false, error: null })}
        title="Permanently Delete Tenant"
        size="md"
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  ⚠️ This action is irreversible!
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  This will permanently delete <strong>{tenant?.businessName}</strong> and all associated data:
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                  <li>All business information and settings</li>
                  <li>Owner login account (email will be freed up)</li>
                  <li>All player/customer records</li>
                  <li>All sessions, payments, dues, and expenses</li>
                  <li>Invoice history and subscription records</li>
                  <li>Staff accounts and shift data</li>
                </ul>
                <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-300">
                  There is no undo. Consider suspending instead if you might need this data later.
                </p>
              </div>
            </div>
          </div>
          {deleteModal.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400">{deleteModal.error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, loading: false, error: null })}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteModal.loading} icon={Trash2}>
              {deleteModal.loading ? 'Deleting...' : 'Yes, Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={(data) => {
          // Refresh stats after payment
          api.get(`/tenants/${id}/stats`).then(res => setStats(res.data.data)).catch(() => {});
        }}
        tenantId={id}
      />

      {/* Reset Password Modal */}
      <Modal
        open={resetModal.open}
        onClose={() => { setResetModal({ open: false, loading: false, result: null, error: null }); setCopied(false); }}
        title="Reset Owner Password"
      >
        {resetModal.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-text-muted">Resetting password...</span>
          </div>
        ) : resetModal.error ? (
          <div className="py-4">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{resetModal.error}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setResetModal({ open: false, loading: false, result: null, error: null })}>Close</Button>
            </div>
          </div>
        ) : resetModal.result ? (
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">✅ Password has been reset successfully!</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Owner</p>
              <p className="text-sm font-medium text-text-primary">{resetModal.result.ownerName} ({resetModal.result.ownerEmail})</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Temporary Password</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-tertiary border border-border font-mono text-sm">
                <span className="flex-1 break-all text-text-primary">{resetModal.result.tempPassword}</span>
                <button
                  onClick={handleCopyPassword}
                  className="p-1.5 rounded-md hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                  title="Copy password"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Share this password with the owner. They will be asked to change it on their next login.
                This password will not be shown again.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setResetModal({ open: false, loading: false, result: null, error: null }); setCopied(false); }}>Done</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
