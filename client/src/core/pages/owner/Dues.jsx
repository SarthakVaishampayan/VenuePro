import { useState, useEffect } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { DollarSign, XCircle } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  partial: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  waived: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
};

export default function Dues() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');

  // Pay modal
  const [showPay, setShowPay] = useState(false);
  const [payDue, setPayDue] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [paying, setPaying] = useState(false);

  // Waive confirm
  const [showWaive, setShowWaive] = useState(false);
  const [waiveDue, setWaiveDue] = useState(null);
  const [waiving, setWaiving] = useState(false);

  const fetchDues = async () => {
    try {
      const { data } = await ownerApi.get(`/dues?status=${statusFilter}`);
      setDues(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDues(); }, [statusFilter]);

  const openPay = (due) => {
    setPayDue(due);
    setPayAmount('');
    setPayMode('cash');
    setShowPay(true);
  };

  const handlePay = async () => {
    if (!payDue) return;
    setPaying(true);
    try {
      const amount = payAmount ? parseFloat(payAmount) : undefined;
      await ownerApi.post(`/dues/${payDue._id}/pay`, { amount, mode: payMode });
      setShowPay(false);
      fetchDues();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to process payment');
    } finally { setPaying(false); }
  };

  const openWaive = (due) => {
    setWaiveDue(due);
    setShowWaive(true);
  };

  const handleWaive = async () => {
    if (!waiveDue) return;
    setWaiving(true);
    try {
      await ownerApi.post(`/dues/${waiveDue._id}/waive`);
      setShowWaive(false);
      fetchDues();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to waive due');
    } finally { setWaiving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dues</h1>
        <p className="text-text-muted mt-1">Manage pending, partial, and paid dues</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['active', 'paid', 'waived'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              statusFilter === s
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
            }`}
          >
            {s === 'active' ? 'Active' : s}
          </button>
        ))}
      </div>

      {/* Dues List */}
      <Card>
        {dues.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">No dues found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Customer</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Session</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Total</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Paid</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Remaining</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dues.map((d) => {
                  const remaining = d.amount - d.paidAmount;
                  return (
                    <tr key={d._id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {d.customerId?.fullName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {d.bookingSessionId?.resourceNameSnapshot || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                        ₹{d.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted text-right">
                        ₹{d.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                        <span className={remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}>
                          ₹{remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ''}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(d.status === 'pending' || d.status === 'partial') && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openPay(d)} title="Pay">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openWaive(d)} title="Waive">
                              <XCircle className="w-4 h-4 text-amber-600" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pay Modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Pay Due" size="sm">
        {payDue && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-secondary rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-text-muted">Customer:</span>
                <span className="font-medium text-text-primary">{payDue.customerId?.fullName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-text-muted">Total Due:</span>
                <span className="font-medium text-text-primary">₹{payDue.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Already Paid:</span>
                <span className="font-medium text-text-primary">₹{payDue.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1 pt-1 border-t border-border">
                <span className="text-text-muted">Remaining:</span>
                <span className="font-semibold text-amber-600">₹{(payDue.amount - payDue.paidAmount).toLocaleString()}</span>
              </div>
            </div>
            <Input
              label={`Amount (leave empty for full payment of ₹${(payDue.amount - payDue.paidAmount).toLocaleString()})`}
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              min="0"
              max={payDue.amount - payDue.paidAmount}
              step="0.5"
            />
            <Select
              label="Payment Mode"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'online', label: 'Online (UPI/Card)' }
              ]}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowPay(false)}>Cancel</Button>
              <Button onClick={handlePay} loading={paying}>
                <DollarSign className="w-4 h-4" />
                Pay Now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waive Confirm Modal */}
      <Modal open={showWaive} onClose={() => setShowWaive(false)} title="Waive Due" size="sm">
        {waiveDue && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <p className="text-amber-800 dark:text-amber-300 font-medium">Are you sure?</p>
              <p className="text-amber-700 dark:text-amber-400 mt-1">
                This will waive <strong>₹{(waiveDue.amount - waiveDue.paidAmount).toLocaleString()}</strong> remaining for <strong>{waiveDue.customerId?.fullName}</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowWaive(false)}>Cancel</Button>
              <Button onClick={handleWaive} loading={waiving} variant="danger">
                <XCircle className="w-4 h-4" />
                Waive Due
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
