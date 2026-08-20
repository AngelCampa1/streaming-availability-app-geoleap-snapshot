'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { RefreshCw, Trash2, Archive, FileText, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onRegenerateSelected: () => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onArchiveSelected?: () => Promise<void>;
  onExportSelected?: () => Promise<void>;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onRegenerateSelected,
  onDeleteSelected,
  onArchiveSelected,
  onExportSelected,
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async (action: () => Promise<void>) => {
    try {
      setLoading(true);
      await action();
      setConfirmAction(null);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Pages',
      description: `Are you sure you want to delete ${selectedCount} pages? This action cannot be undone.`,
      action: onDeleteSelected,
    });
  };

  const confirmRegenerate = () => {
    setConfirmAction({
      type: 'regenerate',
      title: 'Regenerate Pages',
      description: `Are you sure you want to regenerate ${selectedCount} pages? This will overwrite existing content.`,
      action: onRegenerateSelected,
    });
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {onExportSelected && (
            <Button variant="outline" size="sm" onClick={() => handleAction(onExportSelected)} disabled={loading}>
              <FileText className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}

          {onArchiveSelected && (
            <Button variant="outline" size="sm" onClick={() => handleAction(onArchiveSelected)} disabled={loading}>
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={confirmRegenerate} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>

          <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleAction(confirmAction.action)}
              disabled={loading}
              className={confirmAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {loading ? 'Processing...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
