import { useState, useEffect, useCallback } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Search, Phone, Mail, ChevronDown, ChevronUp, AlertCircle, DollarSign, Percent } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Dues expanded per customer
  const [expandedId, setExpandedId] = useState(null);
  const [customerDues, setCustomerDues] = useState({});
  const [loadingDues, setLoadingDues] = useState({});

  // Clear All Dues modal
  const [clearModal, setClearModal] = useState({ open: false, customer: null });
  const [clearAmount, setClearAmount] = useState('');
  const [clearDiscount, setClearDiscount] = useState('');
  const [clearMode, setClearMode] = useState('cash');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');

  const fetchCustomers = async () => {
    try {
      setError('');
      const { data } = await ownerApi.get('/customers');
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

  const toggleExpand = async (customerId) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    setLoadingDues(prev => ({ ...prev, [customerId]: true }));
    try {
      const { data } = await ownerApi.get(`/customers/${customerId}/dues`);
      setCustomerDues(prev => ({ ...prev, [customerId]: data.data || [] }));
    } catch (err) { console.error(err); }
    finally { setLoadingDues(prev => ({ ...prev, [customerId]: false })); }
  };

  const openClearModal = useCallback((customer) => {
    setClearModal({ open: true, customer });
    setClearAmount('');
    setClearDiscount('');
    setClearMode('cash');
    setClearError('');
  }, []);

  const handleClearDues = async () => {
    const customerId = clearModal.customer?._id;
    if (!customerId) return;
    setClearing(true);
    setClearError('');
    try {
      await ownerApi.post(`/customers/${customerId}/pay-dues`, {
        amount: clearAmount ? parseFloat(clearAmount) : undefined,
        discount: clearDiscount ? parseFloat(clearDiscount) : undefined,
        mode: clearMode
      });
      setClearModal({ open: false, customer: null });
      // Refresh both dues and customer list
      const { data: duesData } = await ownerApi.get(`/customers/${customerId}/dues`);
      setCustomerDues(prev => ({ ...prev, [customerId]: duesData.data || [] }));
      await fetchCustomers();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to process payment';
      setClearError(msg);
    } finally {
      setClearing(false);
    }
  };

  const getTotalPending = useCallback((dues) => {
    // Only sum remaining amounts for dues that are actually pending or partial
    // Paid dues should never show the Clear All Dues button
    return dues
      .filter(d => d.status === 'pending' || d.status === 'partial')
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  }, []);

  if (loading) return <PageLoader />;

  if (error && customers.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Players</h1>
            <p className="text-text-muted mt-1">View your players and customers</p>
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
          <p className="text-text-muted mt-1">View your players and customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or phone..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary placeholder:text-text-muted"
        />
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const isExpanded = expandedId === c._id;
          const dues = customerDues[c._id] || [];

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
                {c.nickname && <p className="text-xs text-text-muted mt-1">aka &ldquo;{c.nickname}&rdquo;</p>}
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
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : dues.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-2">No dues history for this player.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-text-primary">Dues</h4>
                        {getTotalPending(dues) > 0 && (
                          <button
                            onClick={() => openClearModal(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Clear All Dues
                          </button>
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
            {search ? 'No players match your search.' : 'No players yet.'}
          </div>
        )}
      </div>

      {/* Clear All Dues Modal */}
      <Modal
        open={clearModal.open}
        onClose={() => setClearModal({ open: false, customer: null })}
        title="Clear All Dues"
        size="sm"
      >
        {clearModal.customer && (() => {
          const dues = customerDues[clearModal.customer._id] || [];
          const totalPending = getTotalPending(dues);
          const discountVal = parseFloat(clearDiscount) || 0;
          const effectiveTotal = Math.max(0, totalPending - discountVal);

          return (
            <div className="space-y-4">
              <div className="p-3 bg-surface-secondary rounded-lg text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Player:</span>
                  <span className="font-medium text-text-primary">{clearModal.customer.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Pending Dues:</span>
                  <span className="font-semibold text-text-primary">₹{totalPending.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Dues Count:</span>
                  <span className="font-medium text-text-primary">{dues.filter(d => d.status === 'pending' || d.status === 'partial').length}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-text-muted">After Discount:</span>
                    <span className="font-semibold text-emerald-600">₹{effectiveTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <Input
                label={`Amount (leave empty to pay ₹${effectiveTotal.toLocaleString()})`}
                type="number"
                value={clearAmount}
                onChange={(e) => {
                  setClearAmount(e.target.value);
                  // If entering a partial amount, clear any discount (discount only for full payment)
                  if (e.target.value && parseFloat(e.target.value) < totalPending) {
                    setClearDiscount('');
                  }
                }}
                min="0"
                max={effectiveTotal}
                step="0.5"
              />

              {(!clearAmount || parseFloat(clearAmount) >= totalPending) && (
                <Input
                  label="Discount (₹) — optional (only for full payment)"
                  type="number"
                  value={clearDiscount}
                  onChange={(e) => setClearDiscount(e.target.value)}
                  min="0"
                  max={totalPending}
                  step="1"
                  icon={Percent}
                />
              )}

              <Select
                label="Payment Mode"
                value={clearMode}
                onChange={(e) => setClearMode(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'online', label: 'Online (UPI/Card)' }
                ]}
              />

              {clearError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                  <p className="text-sm text-red-700 dark:text-red-400">{clearError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setClearModal({ open: false, customer: null })}>
                  Cancel
                </Button>
                <Button onClick={handleClearDues} loading={clearing}>
                  <DollarSign className="w-4 h-4" />
                  {discountVal > 0
                    ? `Pay ₹${(parseFloat(clearAmount) || effectiveTotal).toLocaleString()} (₹${discountVal} off)`
                    : `Pay ₹${(parseFloat(clearAmount) || effectiveTotal).toLocaleString()}`}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
