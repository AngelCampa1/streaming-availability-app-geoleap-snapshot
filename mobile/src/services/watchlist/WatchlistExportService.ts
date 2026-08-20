/**
 * Watchlist Export Service
 * Handles exporting watchlists to various formats
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { logger } from '../../utils/logger';

// Type workaround for expo-file-system exports
const FS = FileSystem as unknown as {
  cacheDirectory: string;
  writeAsStringAsync: (path: string, content: string, options?: { encoding: string }) => Promise<void>;
  EncodingType: { UTF8: string };
};

export interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  rating?: number;
  genres?: string[];
  streamingServices?: string[];
  addedAt: string;
  notes?: string;
}

export interface WatchlistData {
  id: string;
  name: string;
  description?: string;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'text';

class WatchlistExportService {
  /**
   * Export watchlist to specified format
   */
  async exportWatchlist(
    watchlist: WatchlistData,
    format: ExportFormat
  ): Promise<string> {
    switch (format) {
      case 'json':
        return this.toJSON(watchlist);
      case 'csv':
        return this.toCSV(watchlist);
      case 'markdown':
        return this.toMarkdown(watchlist);
      case 'text':
        return this.toText(watchlist);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to JSON format
   */
  private toJSON(watchlist: WatchlistData): string {
    return JSON.stringify(watchlist, null, 2);
  }

  /**
   * Export to CSV format
   */
  private toCSV(watchlist: WatchlistData): string {
    const headers = ['Title', 'Type', 'Year', 'Rating', 'Genres', 'Streaming Services', 'Added Date', 'Notes'];
    const rows = watchlist.items.map(item => [
      this.escapeCSV(item.title),
      item.type,
      item.year?.toString() || '',
      item.rating?.toString() || '',
      item.genres?.join('; ') || '',
      item.streamingServices?.join('; ') || '',
      new Date(item.addedAt).toLocaleDateString(),
      this.escapeCSV(item.notes || ''),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  /**
   * Export to Markdown format
   */
  private toMarkdown(watchlist: WatchlistData): string {
    const lines: string[] = [
      `# ${watchlist.name}`,
      '',
    ];

    if (watchlist.description) {
      lines.push(watchlist.description);
      lines.push('');
    }

    lines.push(`*${watchlist.items.length} items | Last updated: ${new Date(watchlist.updatedAt).toLocaleDateString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Group by type
    const movies = watchlist.items.filter(i => i.type === 'movie');
    const series = watchlist.items.filter(i => i.type === 'series');

    if (movies.length > 0) {
      lines.push('## Movies');
      lines.push('');
      movies.forEach(item => {
        lines.push(this.formatMarkdownItem(item));
      });
      lines.push('');
    }

    if (series.length > 0) {
      lines.push('## TV Series');
      lines.push('');
      series.forEach(item => {
        lines.push(this.formatMarkdownItem(item));
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Exported from GeoLeap*');

    return lines.join('\n');
  }

  /**
   * Export to plain text format
   */
  private toText(watchlist: WatchlistData): string {
    const lines: string[] = [
      watchlist.name.toUpperCase(),
      '='.repeat(watchlist.name.length),
      '',
    ];

    if (watchlist.description) {
      lines.push(watchlist.description);
      lines.push('');
    }

    lines.push(`Total: ${watchlist.items.length} items`);
    lines.push('');

    watchlist.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title} (${item.year || 'N/A'}) - ${item.type}`);
      if (item.streamingServices?.length) {
        lines.push(`   Available on: ${item.streamingServices.join(', ')}`);
      }
      if (item.notes) {
        lines.push(`   Notes: ${item.notes}`);
      }
    });

    lines.push('');
    lines.push('Exported from GeoLeap');

    return lines.join('\n');
  }

  /**
   * Format a single item for Markdown
   */
  private formatMarkdownItem(item: WatchlistItem): string {
    let line = `- **${item.title}**`;

    if (item.year) {
      line += ` (${item.year})`;
    }

    if (item.rating) {
      line += ` - ${item.rating}/10`;
    }

    if (item.streamingServices?.length) {
      line += `\n  - *Available on: ${item.streamingServices.join(', ')}*`;
    }

    if (item.notes) {
      line += `\n  - Notes: ${item.notes}`;
    }

    return line;
  }

  /**
   * Escape special characters for CSV
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Copy exported content to clipboard
   */
  async copyToClipboard(content: string): Promise<void> {
    await Clipboard.setStringAsync(content);
  }

  /**
   * Save to file and share
   */
  async saveAndShare(
    watchlist: WatchlistData,
    format: ExportFormat
  ): Promise<boolean> {
    try {
      const content = await this.exportWatchlist(watchlist, format);

      const extension = format === 'markdown' ? 'md' : format;
      const filename = `${watchlist.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      const filePath = `${FS.cacheDirectory}${filename}`;

      // Write file
      await FS.writeAsStringAsync(filePath, content, {
        encoding: FS.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      // Share file
      await Sharing.shareAsync(filePath, {
        mimeType: this.getMimeType(format),
        dialogTitle: `Share ${watchlist.name}`,
      });

      return true;
    } catch (error) {
      logger.error('[WatchlistExportService] Failed to export watchlist', error);
      return false;
    }
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'markdown':
        return 'text/markdown';
      case 'text':
        return 'text/plain';
      default:
        return 'text/plain';
    }
  }
}

export const watchlistExportService = new WatchlistExportService();
export default watchlistExportService;
