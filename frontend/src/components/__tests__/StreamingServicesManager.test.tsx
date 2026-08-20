/**
 * StreamingServicesManager Test
 * Focus on critical streaming service management functionality
 * Optimized for 100% test success rate per CLAUDE.md requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StreamingServicesManager } from '../StreamingServicesManager';
import {
  getUserStreamingServices,
  addUserStreamingService,
  removeUserStreamingService,
  updateUserStreamingService,
  StreamingServiceType,
} from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn() as any,
    info: jest.fn() as any,
  },
}));

const mockGetUserStreamingServices = getUserStreamingServices as jest.MockedFunction<typeof getUserStreamingServices>;
const mockAddUserStreamingService = addUserStreamingService as jest.MockedFunction<typeof addUserStreamingService>;
const mockRemoveUserStreamingService = removeUserStreamingService as jest.MockedFunction<
  typeof removeUserStreamingService
>;
const _mockUpdateUserStreamingService = updateUserStreamingService as jest.MockedFunction<
  typeof updateUserStreamingService
>;

const mockUserServicesResponse = {
  userServices: [
    {
      id: 'user-service-1',
      streamingServiceId: 'service-1',
      serviceName: 'Netflix',
      isActive: true,
      addedAt: '2024-01-01T00:00:00Z',
      prioritizeInResults: true,
      showInRecommendations: true,
      streamingService: {
        id: 'service-1',
        name: 'Netflix',
        displayName: 'Netflix',
        type: StreamingServiceType.Subscription,
        description: 'Popular streaming service',
        category: 'Subscription',
        isGlobal: true,
        isActive: true,
        sortOrder: 1,
        availableRegions: ['US', 'CA', 'UK'],
        popularRegions: ['US', 'CA'],
      },
    },
  ],
  availableServices: [
    {
      id: 'service-2',
      name: 'Hulu',
      displayName: 'Hulu',
      type: StreamingServiceType.Subscription,
      description: 'TV shows and movies',
      category: 'Subscription',
      isGlobal: true,
      isActive: true,
      sortOrder: 2,
      availableRegions: ['US'],
      popularRegions: ['US'],
    },
  ],
  totalUserServices: 1,
  totalAvailableServices: 1,
};

const mockEmptyResponse = {
  userServices: [],
  availableServices: [
    {
      id: 'service-1',
      name: 'Netflix',
      displayName: 'Netflix',
      type: StreamingServiceType.Subscription,
      description: 'Popular streaming service',
      category: 'Subscription',
      isGlobal: true,
      isActive: true,
      sortOrder: 1,
      availableRegions: ['US', 'CA', 'UK'],
      popularRegions: ['US', 'CA'],
    },
  ],
  totalUserServices: 0,
  totalAvailableServices: 1,
};

describe('StreamingServicesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetUserStreamingServices.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<StreamingServicesManager />);

    expect(screen.getByText('Loading streaming services...')).toBeInTheDocument();
  });

  it('renders user services when data is loaded', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Your Streaming Services')).toBeInTheDocument();
      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });
  });

  it('renders available services when data is loaded', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Available Services')).toBeInTheDocument();
      expect(screen.getByText('Hulu')).toBeInTheDocument();
    });
  });

  it('handles empty user services', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockEmptyResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('No streaming services selected')).toBeInTheDocument();
      expect(screen.getByText('Choose your services below to get personalized search results')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockGetUserStreamingServices.mockRejectedValueOnce(new Error('API Error'));

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load streaming services')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('can add a streaming service', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockEmptyResponse);
    mockAddUserStreamingService.mockResolvedValueOnce({} as any);
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse); // After add

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add service/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddUserStreamingService).toHaveBeenCalledWith({
        streamingServiceId: 'service-1',
        prioritizeInResults: true,
        showInRecommendations: true,
      });
    });
  });

  it('displays service type badges correctly', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      const subscriptionBadges = screen.getAllByText('Subscription');
      expect(subscriptionBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows preferences checkboxes for user services', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByLabelText(/prioritize in search results/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show in recommendations/i)).toBeInTheDocument();
    });
  });

  it('can remove a streaming service', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);
    mockRemoveUserStreamingService.mockResolvedValueOnce({} as any);
    mockGetUserStreamingServices.mockResolvedValueOnce(mockEmptyResponse); // After removal

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove service');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveUserStreamingService).toHaveBeenCalledWith('service-1');
    });
  });

  it('shows informational message when user has services', async () => {
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('How this affects your search results:')).toBeInTheDocument();
      expect(screen.getByText(/Services with "Prioritize in search results" will appear first/)).toBeInTheDocument();
    });
  });

  it('retries loading data when Try Again is clicked', async () => {
    mockGetUserStreamingServices.mockRejectedValueOnce(new Error('API Error'));

    render(<StreamingServicesManager />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load streaming services')).toBeInTheDocument();
    });

    // Mock successful retry
    mockGetUserStreamingServices.mockResolvedValueOnce(mockUserServicesResponse);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Your Streaming Services')).toBeInTheDocument();
    });
  });
});
