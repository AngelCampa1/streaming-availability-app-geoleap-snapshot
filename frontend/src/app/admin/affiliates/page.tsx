'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Plus, TrendingUp } from 'lucide-react';
import { AffiliatePartner } from '@/lib/types/affiliate';

export default function AffiliatesAdminPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/admin/affiliates`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch partners');
      const data = await res.json();
      setPartners(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/affiliates/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(`Failed to toggle partner: ${res.status}`);
        return;
      }
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle partner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Soft-delete this partner?')) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/affiliates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(`Failed to delete partner: ${res.status}`);
        return;
      }
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete partner');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Affiliate Partners</h1>
        <button
          onClick={() => router.push('/admin/affiliates/new')}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Partner
        </button>
      </div>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Partner</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Clicks</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map(partner => (
                <tr key={partner.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {partner.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={partner.logoUrl} alt={partner.name} className="h-6 w-6 object-contain" />
                      )}
                      <span className="font-medium text-foreground">{partner.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        partner.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {partner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{partner.priority}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {(partner.totalClicks ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    ${(partner.totalRevenue ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/affiliates/${partner.id}`)}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/affiliates/${partner.id}/analytics`)}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Analytics"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(partner.id)}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={partner.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <span className="text-xs">{partner.isActive ? 'Off' : 'On'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="p-1.5 rounded-full hover:bg-muted text-destructive hover:text-destructive/80 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No affiliate partners yet. Add your first partner.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
