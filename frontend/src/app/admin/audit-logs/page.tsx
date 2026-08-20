'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  affectedUserId?: string;
  affectedUserEmail?: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  success: boolean;
  timestamp: string;
  roleName?: string;
}

interface AuditLogsResponse {
  auditLogs: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [filters, setFilters] = useState({
    userId: '',
    resource: '',
    action: '',
    success: '',
  });

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: '50',
      });

      if (filters.userId) params.append('userId', filters.userId);

      const data: AuditLogsResponse = await apiCall(`/api/admin/audit-logs?${params}`);

      setAuditLogs(data.auditLogs || []);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        totalCount: data.totalCount,
      });
    } catch (error) {
       
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const getActionBadgeColor = (action: string, success: boolean) => {
    if (!success) return 'bg-error/10 text-error';

    if (action.includes('login')) return 'bg-success/10 text-success';
    if (action.includes('role')) return 'bg-primary/10 text-primary';
    if (action.includes('search')) return 'bg-primary/20 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review system access attempts and administrative actions. Total: {pagination.totalCount} entries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-muted p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Resource</label>
            <select
              value={filters.resource}
              onChange={e => setFilters({ ...filters, resource: e.target.value })}
              className="w-full text-sm border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Resources</option>
              <option value="content">Content</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="role">Role</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Success</label>
            <select
              value={filters.success}
              onChange={e => setFilters({ ...filters, success: e.target.value })}
              className="w-full text-sm border-border rounded-md bg-background text-foreground"
            >
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {auditLogs.map(log => (
                    <tr key={log.id} className={!log.success ? 'bg-error/5' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <div className="text-sm font-medium text-foreground truncate">{log.userEmail}</div>
                        {log.affectedUserEmail && log.affectedUserEmail !== log.userEmail && (
                          <div className="text-xs text-muted-foreground truncate">→ {log.affectedUserEmail}</div>
                        )}
                        <div className="text-xs text-muted-foreground truncate">{log.ipAddress}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action, log.success)}`}
                        >
                          {log.action.replace('_', ' ')}
                        </span>
                        {log.roleName && <div className="text-xs text-muted-foreground mt-1 truncate">Role: {log.roleName}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground max-w-xs truncate">{log.resource}</td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full mr-2 ${log.success ? 'bg-success' : 'bg-error'}`}
                          ></div>
                          <span className="text-sm text-foreground">{log.success ? 'Success' : 'Failed'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs line-clamp-2">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-2 border border-border rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 border border-border rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
