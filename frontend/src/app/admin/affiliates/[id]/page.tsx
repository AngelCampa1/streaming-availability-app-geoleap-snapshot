'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import { AffiliatePartner } from '@/lib/types/affiliate';

export default function AffiliatePartnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const [partner, setPartner] = useState<Partial<AffiliatePartner>>({
    name: '',
    affiliateUrlTemplate: '',
    priority: 0,
    isActive: true,
    commissionType: 'percentage',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

  useEffect(() => {
    if (isNew) return;
    const fetchPartner = async () => {
      try {
        const res = await fetch(`${apiBase}/api/admin/affiliates/${id}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Partner not found');
        setPartner(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load partner');
      } finally {
        setLoading(false);
      }
    };
    fetchPartner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = isNew
        ? `${apiBase}/api/admin/affiliates`
        : `${apiBase}/api/admin/affiliates/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(partner),
      });
      if (!res.ok) throw new Error('Failed to save partner');
      router.push('/admin/affiliates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/affiliates')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {isNew ? 'Add Partner' : 'Edit Partner'}
        </h1>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
          <input
            type="text"
            value={partner.name ?? ''}
            onChange={e => setPartner(p => ({ ...p, name: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. NordVPN"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
          <input
            type="url"
            value={partner.logoUrl ?? ''}
            onChange={e => setPartner(p => ({ ...p, logoUrl: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Affiliate URL Template *
          </label>
          <input
            type="text"
            value={partner.affiliateUrlTemplate ?? ''}
            onChange={e => setPartner(p => ({ ...p, affiliateUrlTemplate: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            placeholder="https://go.example.com?aff={affId}"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use {'{'}placeholder{'}'} for dynamic values
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
            <input
              type="number"
              value={partner.priority ?? 0}
              onChange={e =>
                setPartner(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Commission Type
            </label>
            <select
              value={partner.commissionType ?? 'percentage'}
              onChange={e =>
                setPartner(p => ({
                  ...p,
                  commissionType: e.target.value as 'percentage' | 'flat' | 'cpa',
                }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Rate</option>
              <option value="cpa">CPA</option>
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={partner.isActive ?? true}
              onChange={e => setPartner(p => ({ ...p, isActive: e.target.checked }))}
              className="rounded border-input"
            />
            Active
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !partner.name || !partner.affiliateUrlTemplate}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Partner'}
          </button>
          <button
            onClick={() => router.push('/admin/affiliates')}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
