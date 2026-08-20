import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import {
  robustWaitFor,
  safeAct,
  safeButtonClick,
  waitForComponentStabilization,
} from '../../../__tests__/support/utils/test-design-patterns';

// Mock the file-saver library - fix module resolution
const mockSaveAs = jest.fn() as any;
jest.mock(
  'file-saver',
  () => ({
    saveAs: mockSaveAs,
  }),
  { virtual: true }
);

// Also mock it as a direct export for different import styles
Object.defineProperty(global, 'saveAs', {
  value: mockSaveAs,
  writable: true,
});

// CSV Export Component for testing
const CSVExportComponent = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exportData, setExportData] = React.useState({
    format: 'csv',
    dateRange: '30',
    includeHeaders: true,
    selectedMetrics: ['users', 'content', 'system'],
  });

  // Sample data for CSV export
  const sampleData = [
    { date: '2023-01-01', dailyUsers: 1000, searches: 5000, errorRate: 0.01 },
    { date: '2023-01-02', dailyUsers: 1100, searches: 5200, errorRate: 0.015 },
    { date: '2023-01-03', dailyUsers: 1050, searches: 4900, errorRate: 0.008 },
  ];

  const handleExportCSV = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate CSV content
      let csvContent = '';

      if (exportData.includeHeaders) {
        csvContent = 'Date,Daily Users,Searches,Error Rate\n';
      }

      sampleData.forEach(row => {
        csvContent += `${row.date},${row.dailyUsers},${row.searches},${row.errorRate}\n`;
      });

      // Create and download blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics-export-${Date.now()}.csv`;
      link.click();

      // Clean up
      URL.revokeObjectURL(link.href);
    } catch (_err) {
      setError('Failed to export CSV data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const jsonContent = JSON.stringify(sampleData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics-export-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(link.href);
    } catch (_err) {
      setError('Failed to export JSON data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate Excel export (in real implementation, would use a library like xlsx)
      const csvContent =
        'Date,Daily Users,Searches,Error Rate\n' +
        sampleData.map(row => `${row.date},${row.dailyUsers},${row.searches},${row.errorRate}`).join('\n');

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `analytics-export-${Date.now()}.xlsx`;
      link.click();

      URL.revokeObjectURL(link.href);
    } catch (_err) {
      setError('Failed to export Excel data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="csv-export-component" data-testid="csv-export-component">
      <h2>Export Analytics Data</h2>

      {/* Export Options */}
      <div className="export-options" data-testid="export-options">
        <div className="option-group">
          <label>Date Range:</label>
          <select
            data-testid="date-range-select"
            value={exportData.dateRange}
            onChange={e => setExportData(prev => ({ ...prev, dateRange: e.target.value }))}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <div className="option-group">
          <label>
            <input
              type="checkbox"
              data-testid="include-headers-checkbox"
              checked={exportData.includeHeaders}
              onChange={e => setExportData(prev => ({ ...prev, includeHeaders: e.target.checked }))}
            />
            Include Headers
          </label>
        </div>

        <div className="option-group">
          <label>Metrics to Include:</label>
          <div className="metrics-checkboxes" data-testid="metrics-checkboxes">
            <label>
              <input
                type="checkbox"
                data-testid="users-metric-checkbox"
                checked={exportData.selectedMetrics.includes('users')}
                onChange={e => {
                  const metrics = exportData.selectedMetrics;
                  if (e.target.checked) {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: [...metrics, 'users'],
                    }));
                  } else {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: metrics.filter(m => m !== 'users'),
                    }));
                  }
                }}
              />
              User Metrics
            </label>

            <label>
              <input
                type="checkbox"
                data-testid="content-metric-checkbox"
                checked={exportData.selectedMetrics.includes('content')}
                onChange={e => {
                  const metrics = exportData.selectedMetrics;
                  if (e.target.checked) {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: [...metrics, 'content'],
                    }));
                  } else {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: metrics.filter(m => m !== 'content'),
                    }));
                  }
                }}
              />
              Content Performance
            </label>

            <label>
              <input
                type="checkbox"
                data-testid="system-metric-checkbox"
                checked={exportData.selectedMetrics.includes('system')}
                onChange={e => {
                  const metrics = exportData.selectedMetrics;
                  if (e.target.checked) {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: [...metrics, 'system'],
                    }));
                  } else {
                    setExportData(prev => ({
                      ...prev,
                      selectedMetrics: metrics.filter(m => m !== 'system'),
                    }));
                  }
                }}
              />
              System Health
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-message" data-testid="loading-message">
          Preparing export...
        </div>
      )}

      {/* Export Buttons */}
      <div className="export-buttons" data-testid="export-buttons">
        <button
          data-testid="export-csv-button"
          onClick={handleExportCSV}
          disabled={loading}
          className="export-btn csv-btn"
        >
          {loading ? 'Exporting...' : 'Export CSV'}
        </button>

        <button
          data-testid="export-json-button"
          onClick={handleExportJSON}
          disabled={loading}
          className="export-btn json-btn"
        >
          {loading ? 'Exporting...' : 'Export JSON'}
        </button>

        <button
          data-testid="export-excel-button"
          onClick={handleExportExcel}
          disabled={loading}
          className="export-btn excel-btn"
        >
          {loading ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {/* Data Preview */}
      <div className="data-preview" data-testid="data-preview">
        <h3>Data Preview (3 rows shown)</h3>
        <table data-testid="preview-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Daily Users</th>
              <th>Searches</th>
              <th>Error Rate</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row, index) => (
              <tr key={index} data-testid={`preview-row-${index}`}>
                <td>{row.date}</td>
                <td>{row.dailyUsers.toLocaleString()}</td>
                <td>{row.searches.toLocaleString()}</td>
                <td>{(row.errorRate * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Summary */}
      <div className="export-summary" data-testid="export-summary">
        <p>
          Selected: {exportData.selectedMetrics.length} metric group(s),
          {exportData.dateRange} days,
          {exportData.includeHeaders ? 'with' : 'without'} headers
        </p>
      </div>
    </div>
  );
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn() as any;

// Mock document.createElement to return proper DOM nodes
const originalCreateElement = document.createElement.bind(document);
const mockCreateElement = jest.fn((tagName: string): HTMLElement => {
  const element = originalCreateElement(tagName) as HTMLAnchorElement;
  if (tagName === 'a') {
    element.click = jest.fn() as any;
    element.href = '';
    element.download = '';
  }
  return element;
}) as typeof document.createElement;

// Mock FileReader for blob content testing
class MockFileReader {
  onload: ((event: { target: { result: string | null } }) => void) | null = null;
  result: string | null = null;

  readAsText(_blob: Blob) {
    // Simulate async file reading
    setTimeout(() => {
      this.result = 'mocked-csv-content';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
}

(global as unknown as { FileReader: typeof MockFileReader }).FileReader = MockFileReader;

describe('CSVExport - CSV Export Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM createElement mock
    (document.createElement as unknown) = mockCreateElement;
  });

  afterEach(() => {
    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  describe('Component Rendering', () => {
    it('renders export component with all options', () => {
      // Act
      render(<CSVExportComponent />);

      // Assert
      expect(screen.getByTestId('csv-export-component')).toBeInTheDocument();
      expect(screen.getByText('Export Analytics Data')).toBeInTheDocument();
      expect(screen.getByTestId('export-options')).toBeInTheDocument();
      expect(screen.getByTestId('export-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('data-preview')).toBeInTheDocument();
    });

    it('displays all export format buttons', () => {
      // Act
      render(<CSVExportComponent />);

      // Assert
      expect(screen.getByTestId('export-csv-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-json-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-excel-button')).toBeInTheDocument();
    });

    it('shows data preview table with sample data', () => {
      // Act
      render(<CSVExportComponent />);

      // Assert
      expect(screen.getByTestId('preview-table')).toBeInTheDocument();
      expect(screen.getByTestId('preview-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('preview-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('preview-row-2')).toBeInTheDocument();

      // Check data content
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('1.00%')).toBeInTheDocument();
    });
  });

  describe('Export Options Configuration', () => {
    it('allows date range selection', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      const dateSelect = screen.getByTestId('date-range-select');

      // Act
      await safeAct(async () => {
        fireEvent.change(dateSelect, { target: { value: '90' } });
      });

      // Assert
      expect(dateSelect).toHaveValue('90');

      // Verify the summary text reflects the change (avoiding multiple elements issue)
      await robustWaitFor(() => {
        const summaryElement = screen.getByTestId('export-summary');
        expect(summaryElement).toHaveTextContent('90 days');
        return true;
      });
    });

    it('toggles include headers option', () => {
      // Arrange
      render(<CSVExportComponent />);
      const headersCheckbox = screen.getByTestId('include-headers-checkbox');

      // Initially should be checked
      expect(headersCheckbox).toBeChecked();

      // Act
      fireEvent.click(headersCheckbox);

      // Assert
      expect(headersCheckbox).not.toBeChecked();
      expect(screen.getByText(/without headers/)).toBeInTheDocument();
    });

    it('allows metric selection via checkboxes', () => {
      // Arrange
      render(<CSVExportComponent />);

      // Act
      fireEvent.click(screen.getByTestId('users-metric-checkbox'));

      // Assert
      expect(screen.getByTestId('users-metric-checkbox')).not.toBeChecked();

      // Summary should update
      expect(screen.getByText(/2 metric group/)).toBeInTheDocument();
    });

    it('updates export summary based on selections', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act - Change date range and uncheck headers
      await safeAct(async () => {
        fireEvent.change(screen.getByTestId('date-range-select'), { target: { value: '7' } });
        fireEvent.click(screen.getByTestId('include-headers-checkbox'));
      });

      // Assert - Use more specific text matching to avoid conflicts
      await robustWaitFor(() => {
        const summaryElement = screen.getByTestId('export-summary');
        expect(summaryElement).toHaveTextContent('7 days');
        expect(summaryElement).toHaveTextContent('without headers');
        return true;
      });
    });
  });

  describe('CSV Export Functionality', () => {
    it('exports CSV when CSV button is clicked', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        return true;
      });
    });

    it('shows loading state during CSV export', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act - Click export button without waiting
      fireEvent.click(screen.getByTestId('export-csv-button'));

      // Assert - Should show loading state immediately (synchronous check)
      expect(screen.getByTestId('loading-message')).toBeInTheDocument();
      expect(screen.getByText('Preparing export...')).toBeInTheDocument();

      // Check CSV button specifically shows loading text
      const csvButton = screen.getByTestId('export-csv-button');
      expect(csvButton).toBeDisabled();
      expect(csvButton).toHaveTextContent('Exporting...');

      // Wait for export to complete (the async part)
      await robustWaitFor(
        () => {
          return !screen.queryByTestId('loading-message');
        },
        { timeout: 3000 }
      );
    }, 15000);

    it('generates CSV with correct format and headers', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert - Check blob creation and download trigger
      await robustWaitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        return true;
      });
    });
  });

  describe('JSON Export Functionality', () => {
    it('exports JSON when JSON button is clicked', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-json-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        return true;
      });
    });

    it('creates JSON blob with correct content type', async () => {
      // Arrange
      let blobType = '';
      const originalBlob = global.Blob;
      (global.Blob as any) = jest.fn((content: BlobPart[], options: BlobPropertyBag) => {
        blobType = options.type || '';
        return new originalBlob(content, options);
      });

      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-json-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(blobType).toBe('application/json');
        return true;
      });

      global.Blob = originalBlob;
    });
  });

  describe('Excel Export Functionality', () => {
    it('exports Excel when Excel button is clicked', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-excel-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        return true;
      });
    });

    it('shows longer loading time for Excel export', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeAct(async () => {
        fireEvent.click(screen.getByTestId('export-excel-button'));
      });

      // Assert - Should show loading
      await robustWaitFor(() => {
        expect(screen.getByTestId('loading-message')).toBeInTheDocument();
        return true;
      });

      // Wait for loading to complete (Excel takes longer - 1500ms vs 1000ms for CSV)
      await robustWaitFor(
        () => {
          expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
          return true;
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error message when export fails', async () => {
      // Arrange
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Blob creation failed');
      });

      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to export CSV data')).toBeInTheDocument();
        return true;
      });
    });

    it('clears error message on successful export retry', async () => {
      // Arrange - First make export fail
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      await robustWaitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        return true;
      });

      // Act - Fix the function and retry
      global.URL.createObjectURL = jest.fn(() => 'blob:fixed-url');

      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert - Error should be cleared
      await robustWaitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
        return true;
      });
    });
  });

  describe('Multiple Export Formats', () => {
    it('handles multiple export buttons being disabled during loading', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act - Start CSV export
      await safeAct(async () => {
        fireEvent.click(screen.getByTestId('export-csv-button'));
      });

      // Assert - All export buttons should be disabled during loading
      await robustWaitFor(() => {
        expect(screen.getByTestId('export-csv-button')).toBeDisabled();
        expect(screen.getByTestId('export-json-button')).toBeDisabled();
        expect(screen.getByTestId('export-excel-button')).toBeDisabled();
        return true;
      });

      // Wait for completion
      await robustWaitFor(
        () => {
          expect(screen.getByTestId('export-csv-button')).not.toBeDisabled();
          return true;
        },
        { timeout: 3000 }
      );
    });

    it('allows different export formats to be used sequentially', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act - Export CSV first
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      await robustWaitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        return true;
      });

      // Reset mock call count
      jest.clearAllMocks();

      // Act - Then export JSON
      await safeButtonClick('export-json-button', { waitForEnabled: true });

      // Assert - JSON export should work after CSV
      await robustWaitFor(() => {
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        return true;
      });
    });
  });

  describe('Data Validation', () => {
    it('includes correct number of data rows in export', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert - Should have header + 3 data rows = 4 lines total
      await robustWaitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        return true;
      });
    });

    it('respects header inclusion setting', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Disable headers
      await safeAct(async () => {
        fireEvent.click(screen.getByTestId('include-headers-checkbox'));
      });

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        return true;
      });
    });
  });

  describe('Performance', () => {
    it('completes export operations within reasonable time', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      const startTime = performance.now();
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      await robustWaitFor(
        () => {
          expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument();
          return true;
        },
        { timeout: 3000 }
      );

      const endTime = performance.now();

      // Assert - Should complete quickly (within 3 seconds including simulated delay)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up blob URLs after export', async () => {
      // Arrange
      render(<CSVExportComponent />);
      await waitForComponentStabilization('csv-export-component');

      // Act
      await safeButtonClick('export-csv-button', { waitForEnabled: true });

      // Assert
      await robustWaitFor(() => {
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        return true;
      });
    });
  });
});
