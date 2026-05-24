'use client';

import { useState, useEffect } from 'react';
import { Settings2, Plus, CheckCircle2, XCircle, AlertCircle, Percent, Calendar, DollarSign } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  interest_rate: number;
  min_amount: number;
  max_amount: number;
  min_tenor: number;
  max_tenor: number;
};

const emptyForm = {
  name: '',
  description: '',
  min_amount: '5000',
  max_amount: '25000',
  min_tenor: '7',
  max_tenor: '30',
  interest_rate: '0.20',
};

export default function ProductFactoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/lending-products', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Failed to fetch products');
      setProducts(json.data || []);
      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const openCreate = () => {
    setEditingProductId(null);
    setForm({ ...emptyForm });
    setShowCreate(true);
  };

  const openEdit = (product: Product) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      min_amount: String(product.min_amount),
      max_amount: String(product.max_amount),
      min_tenor: String(product.min_tenor),
      max_tenor: String(product.max_tenor),
      interest_rate: String(product.interest_rate),
    });
    setShowCreate(true);
  };

  const createOrUpdateProduct = async () => {
    try {
      setCreating(true);
      setError('');
      if (!form.name.trim()) throw new Error('Product name is required');
      const payload = {
        ...form,
        min_amount: Number(form.min_amount),
        max_amount: Number(form.max_amount),
        min_tenor: Number(form.min_tenor),
        max_tenor: Number(form.max_tenor),
        interest_rate: Number(form.interest_rate),
      };
      if (
        !Number.isFinite(payload.min_amount) ||
        !Number.isFinite(payload.max_amount) ||
        !Number.isFinite(payload.min_tenor) ||
        !Number.isFinite(payload.max_tenor) ||
        !Number.isFinite(payload.interest_rate)
      ) {
        throw new Error('All numeric fields must be valid numbers');
      }
      if (payload.min_amount <= 0 || payload.max_amount <= 0) throw new Error('Loan amounts must be greater than zero');
      if (payload.min_tenor <= 0 || payload.max_tenor <= 0) throw new Error('Tenor values must be greater than zero');
      if (payload.min_amount > payload.max_amount) throw new Error('Minimum amount cannot be greater than maximum amount');
      if (payload.min_tenor > payload.max_tenor) throw new Error('Minimum tenor cannot be greater than maximum tenor');
      if (payload.interest_rate < 0) throw new Error('Interest rate cannot be negative');
      const isEdit = Boolean(editingProductId);
      const res = await fetch(
        isEdit ? '/api/admin/lending-products/update' : '/api/admin/lending-products',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isEdit ? { id: editingProductId, ...payload } : payload),
        },
      );
      const json = await res.json().catch(() => null);
      if (res.status === 401) throw new Error('Session expired. Please log in again.');
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || (isEdit ? 'Failed to update product' : 'Failed to create product'));
      }
      setShowCreate(false);
      setEditingProductId(null);
      setForm({ ...emptyForm });
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product');
    } finally {
      setCreating(false);
    }
  };

  const toggleProduct = async (id: string) => {
    try {
      setSavingId(id);
      setError('');
      const res = await fetch(`/api/admin/lending-products/${id}/toggle`, { method: 'PATCH' });
      const json = await res.json().catch(() => null);
      if (res.status === 401) throw new Error('Session expired. Please log in again.');
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Failed to toggle product');
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle product');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Factory</h1>
          <p className="text-sm text-slate-400 mt-1">Configure interest rates, loan limits, and repayment windows.</p>
          <p className="text-xs text-slate-500 mt-2">
            Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchProducts()}
            disabled={loading}
            className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
          >
            Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="text-white font-semibold">{editingProductId ? 'Edit Product Configuration' : 'Create Product'}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold">Product Name</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. QuickCash 30" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Description</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="Short product summary" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Minimum Loan Amount (NGN)</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. 5000" value={form.min_amount} onChange={(e) => setForm((p) => ({ ...p, min_amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Maximum Loan Amount (NGN)</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. 25000" value={form.max_amount} onChange={(e) => setForm((p) => ({ ...p, max_amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Minimum Tenor (Days)</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. 7" value={form.min_tenor} onChange={(e) => setForm((p) => ({ ...p, min_tenor: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold">Maximum Tenor (Days)</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. 30" value={form.max_tenor} onChange={(e) => setForm((p) => ({ ...p, max_tenor: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 font-semibold">Interest Rate (Decimal, e.g. 0.20 for 20%)</label>
              <input className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" placeholder="e.g. 0.20" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={creating} onClick={createOrUpdateProduct} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60">
              {creating ? 'Saving...' : editingProductId ? 'Save Changes' : 'Create'}
            </button>
            <button onClick={() => { setShowCreate(false); setEditingProductId(null); }} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map(i => (<div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-64 animate-pulse" />))
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                      <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{product.name}</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{String(product.id).slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className={cn('px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5', product.is_active ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500')}>
                    {product.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {product.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500"><Percent className="w-3 h-3" /><span className="text-[10px] font-bold uppercase">Interest Rate</span></div>
                    <div className="text-xl font-bold text-white">{(Number(product.interest_rate) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500"><DollarSign className="w-3 h-3" /><span className="text-[10px] font-bold uppercase">Limit Range</span></div>
                    <div className="text-sm font-bold text-white">{formatCurrency(Number(product.min_amount))} - {formatCurrency(Number(product.max_amount))}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500"><Calendar className="w-3 h-3" /><span className="text-[10px] font-bold uppercase">Tenor Range</span></div>
                    <div className="text-sm font-bold text-white">{Number(product.min_tenor)} - {Number(product.max_tenor)} Days</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors">View Eligibility Rules</button>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(product)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-colors">Edit Config</button>
                  <button disabled={savingId === product.id} onClick={() => toggleProduct(String(product.id))} className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors disabled:opacity-50">
                    {savingId === product.id ? 'Updating...' : product.is_active ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {!loading && products.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
            <Settings2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-500">No products configured</h3>
            <p className="text-sm text-slate-600 mt-1">Start by creating your first loan product.</p>
          </div>
        )}
      </div>

      <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 shrink-0"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <h4 className="text-sm font-bold text-blue-400">Regulatory Constraints</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">All products are currently hard-capped at ₦25,000 maximum amount and 30 days maximum tenor in compliance with FCCPC digital lending guidelines for the initial pilot phase.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
