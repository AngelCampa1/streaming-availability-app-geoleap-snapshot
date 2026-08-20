'use client';

import * as React from 'react';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, Edit, RefreshCw, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SeoPage } from '@/lib/seo/types';

interface PagesTableProps {
  pages: SeoPage[];
  selectedIds: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSelectPage: (id: string) => void;
  onSelectAll: () => void;
  onSort: (field: string, order: 'asc' | 'desc') => void;
  onEditPage?: (page: SeoPage) => void;
  onDeletePage: (id: string) => void;
  onRegeneratePage: (id: string) => void;
}

export function PagesTable({
  pages,
  selectedIds,
  sortBy,
  sortOrder,
  onSelectPage,
  onSelectAll,
  onSort,
  onEditPage,
  onDeletePage,
  onRegeneratePage,
}: PagesTableProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleAction = async (action: () => Promise<void>, pageId: string) => {
    try {
      setLoading(prev => ({ ...prev, [pageId]: true }));
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, [pageId]: false }));
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return ArrowUpDown;
    return sortOrder === 'asc' ? ArrowUp : ArrowDown;
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, newOrder);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === pages.length && pages.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('title')} className="h-auto p-0 font-semibold">
                Title
                {React.createElement(getSortIcon('title'), {
                  className: 'ml-1 h-4 w-4',
                })}
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('performance.views')}
                className="h-auto p-0 font-semibold"
              >
                Views
                {React.createElement(getSortIcon('performance.views'), {
                  className: 'ml-1 h-4 w-4',
                })}
              </Button>
            </TableHead>
            <TableHead>CTR</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>CWV</TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('updatedAt')} className="h-auto p-0 font-semibold">
                Updated
                {React.createElement(getSortIcon('updatedAt'), {
                  className: 'ml-1 h-4 w-4',
                })}
              </Button>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map(page => (
            <TableRow key={page.id}>
              <TableCell>
                <Checkbox checked={selectedIds.includes(page.id)} onCheckedChange={() => onSelectPage(page.id)} />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{page.title}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">{page.url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => window.open(page.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(page.status)}>{page.status}</Badge>
              </TableCell>
              <TableCell className="text-right">{formatNumber(page.performance.views)}</TableCell>
              <TableCell className="text-right">{(page.performance.ctr * 100).toFixed(1)}%</TableCell>
              <TableCell className="text-right">{page.performance.avgPosition.toFixed(1)}</TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Badge variant={page.seoMetrics.coreWebVitals.passed ? 'default' : 'destructive'} className="text-xs">
                    {page.seoMetrics.coreWebVitals.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(page.updatedAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEditPage && (
                      <DropdownMenuItem onClick={() => onEditPage(page)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleAction(async () => onRegeneratePage(page.id), page.id)}
                      disabled={loading[page.id]}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading[page.id] ? 'animate-spin' : ''}`} />
                      Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAction(async () => onDeletePage(page.id), page.id)}
                      disabled={loading[page.id]}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {pages.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No pages found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
