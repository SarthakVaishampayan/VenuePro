import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Send, User, Paperclip,
  Clock, CheckCircle, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardHeader } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const { data } = await api.get(`/support/tickets/${id}`);
        setTicket(data.data);
        setStatus(data.data.status);
      } catch (err) {
        console.error('Failed to load ticket:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/support/tickets/${id}/messages`, {
        message: reply,
        isStaffOnly: false
      });
      // Backend returns the full updated ticket
      setTicket(data.data);
      setReply('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/support/tickets/${id}`, { status: newStatus });
      setStatus(newStatus);
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading) return <PageLoader />;
  if (!ticket) return <p className="text-text-muted">Ticket not found.</p>;

  const messages = ticket.messages || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/superadmin/tickets')} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary">{ticket.subject}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            #{ticket.ticketNumber || ticket._id?.slice(-6)} · Created {new Date(ticket.createdAt).toLocaleDateString()}
            {ticket.tenant?.businessName && ` · ${ticket.tenant.businessName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'waiting_on_customer', label: 'Waiting' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0">
            <div className="p-4 border-b border-border bg-surface-secondary/50">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  ticket.priority === 'urgent' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  ticket.priority === 'high' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                  'bg-surface-tertiary text-text-muted'
                }`}>
                  {ticket.priority?.toUpperCase() || 'MEDIUM'}
                </span>
                {ticket.assignedTo && (
                  <span>Assigned to {ticket.assignedTo.name || ticket.assignedTo.email}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-text-primary">{ticket.description}</p>
            </div>

            {/* Messages thread */}
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-6 text-center text-sm text-text-muted">No replies yet</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg._id || i} className={`p-4 ${msg.senderType === 'superadmin' ? 'bg-primary-50/30 dark:bg-primary-900/5' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        msg.senderType === 'superadmin'
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : 'bg-surface-tertiary'
                      }`}>
                        <User className="w-3.5 h-3.5 text-text-muted" />
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {msg.senderName || (msg.senderType === 'superadmin' ? 'Support' : 'Tenant')}
                      </span>
                      <span className="text-xs text-text-muted ml-auto">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary ml-9 whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="flex gap-2 mt-2 ml-9">
                        {msg.attachments.map((att, j) => (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface-tertiary text-text-muted">
                            <Paperclip className="w-3 h-3" />
                            {att.filename || 'Attachment'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Reply box */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Add Reply</h3>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <Button variant="ghost" size="sm" icon={Paperclip}>Attach file</Button>
              <Button onClick={handleSendReply} loading={sending} icon={Send}>
                Send Reply
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Status</span>
                <StatusBadge status={status} />
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Priority</span>
                <span className="font-medium text-text-primary capitalize">{ticket.priority || 'Medium'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Created</span>
                <span className="text-text-primary">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Updated</span>
                <span className="text-text-primary">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Messages</span>
                <span className="text-text-primary">{messages.length}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" />
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full justify-start"
                size="sm"
                icon={CheckCircle}
                onClick={() => handleStatusChange('resolved')}
              >
                Mark Resolved
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                size="sm"
                icon={RefreshCw}
                onClick={() => handleStatusChange('in_progress')}
              >
                Start Progress
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
