import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, BookOpen, Edit3, Trash2, Eye, EyeOff,
  RefreshCw, ThumbsUp, ThumbsDown, Tag, Globe
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';

const CATEGORIES = [
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'payments', label: 'Payments' },
  { value: 'staff', label: 'Staff' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'billing', label: 'Billing' },
  { value: 'general', label: 'General' }
];

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    summary: '',
    content: '',
    tags: '',
    status: 'draft',
    isFeatured: false
  });

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await api.get('/help-articles', { params });
      setArticles(data.data);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'general',
      summary: '',
      content: '',
      tags: '',
      status: 'draft',
      isFeatured: false
    });
  };

  const openEdit = (article) => {
    if (article) {
      setFormData({
        title: article.title || '',
        category: article.category || 'general',
        summary: article.summary || '',
        content: article.content || '',
        tags: article.tags?.join(', ') || '',
        status: article.status || 'draft',
        isFeatured: article.isFeatured || false
      });
      setEditModal(article);
    } else {
      resetForm();
      setEditModal({ _id: null });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editModal?._id) {
        await api.patch(`/help-articles/${editModal._id}`, payload);
      } else {
        await api.post('/help-articles', payload);
      }

      setEditModal(null);
      resetForm();
      fetchArticles();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/help-articles/${deleteId}`);
      setDeleteId(null);
      fetchArticles();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleStatusToggle = async (article) => {
    try {
      const newStatus = article.status === 'published' ? 'draft' : 'published';
      await api.patch(`/help-articles/${article._id}`, { status: newStatus });
      fetchArticles();
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  const filteredArticles = articles.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Knowledge Base</h1>
          <p className="text-text-muted mt-1">Create and manage help articles for your tenants</p>
        </div>
        <Button onClick={() => openEdit(null)} icon={Plus}>New Article</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-lg font-bold text-text-primary">{articles.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Published</p>
              <p className="text-lg font-bold text-text-primary">{articles.filter(a => a.status === 'published').length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Views</p>
              <p className="text-lg font-bold text-text-primary">
                {articles.reduce((sum, a) => sum + (a.viewCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
              <ThumbsUp className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Helpful</p>
              <p className="text-lg font-bold text-text-primary">
                {articles.reduce((sum, a) => sum + (a.helpfulCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchArticles} />
      </div>

      {/* Articles */}
      {loading ? (
        <PageLoader />
      ) : filteredArticles.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">No articles found</p>
            <Button variant="primary" size="sm" icon={Plus} className="mt-4" onClick={() => openEdit(null)}>
              Create your first article
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredArticles.map((article) => (
            <Card key={article._id} hover className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={article.status} />
                    <span className="text-xs bg-surface-secondary rounded px-2 py-0.5 text-text-muted capitalize">
                      {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
                    </span>
                    {article.isFeatured && (
                      <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded px-2 py-0.5">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{article.title}</h3>
                  {article.summary && (
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                    {article.viewCount > 0 && <span>{article.viewCount} views</span>}
                    {(article.helpfulCount > 0 || article.notHelpfulCount > 0) && (
                      <span>
                        <ThumbsUp className="w-3 h-3 inline mr-0.5" />
                        {article.helpfulCount || 0}
                        <ThumbsDown className="w-3 h-3 inline ml-2 mr-0.5" />
                        {article.notHelpfulCount || 0}
                      </span>
                    )}
                    {article.tags?.length > 0 && (
                      <span>
                        <Tag className="w-3 h-3 inline mr-0.5" />
                        {article.tags.slice(0, 3).join(', ')}
                      </span>
                    )}
                    <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleStatusToggle(article)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                    title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {article.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(article)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(article._id)}
                    className="p-2 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal?._id ? 'Edit Article' : 'New Article'}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., How to create a booking"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORIES}
              required
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' }
              ]}
            />
          </div>

          <Input
            label="Summary"
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Brief description shown in search results"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted font-mono"
              placeholder="Write your article content here... (HTML or Markdown supported)"
            />
          </div>

          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g., bookings, setup, guide"
          />

          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            Feature this article (shown at top of knowledge base)
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>
              {editModal?._id ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Article">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete this article? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
