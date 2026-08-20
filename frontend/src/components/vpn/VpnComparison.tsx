/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, Star, Check, Minus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VpnProvider {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  serverCount: number;
  countryCount: number;
  supportsP2P: boolean;
  supportsStreaming: boolean;
  hasKillSwitch: boolean;
  hasNoLogsPolicy: boolean;
  maxSimultaneousConnections?: number;
  overallRating?: number;
  totalRatings: number;
  hasFreeTrial: boolean;
  freeTrialDays?: number;
  streamingCompatibilities: StreamingCompatibility[];
}

interface StreamingCompatibility {
  streamingServiceName: string;
  status: 'NotTested' | 'WorksReliably' | 'WorksSometimes' | 'DoesNotWork' | 'Blocked';
}

interface ComparisonResult {
  providers: VpnProvider[];
  comparisonCriteria: {
    comparePrice: boolean;
    compareFeatures: boolean;
    compareRatings: boolean;
    compareStreaming: boolean;
  };
  comparisonMatrix: Record<string, any>;
}

const VpnComparison: React.FC = () => {
  const { user: _user } = useAuth();
  const [availableProviders, setAvailableProviders] = useState<VpnProvider[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [compareOptions, setCompareOptions] = useState({
    comparePrice: true,
    compareFeatures: true,
    compareRatings: true,
    compareStreaming: false,
  });

  useEffect(() => {
    fetchAvailableProviders();
  }, []);

  const fetchAvailableProviders = async () => {
    try {
      const response = await fetch('/api/vpnguidance/providers');
      if (!response.ok) throw new Error('Failed to fetch providers');
      const data = await response.json();
      setAvailableProviders(data);
    } catch (_err) {
      setError('Failed to load VPN providers');
    }
  };

  const fetchComparison = async () => {
    if (selectedProviders.length < 2) {
      setError('Please select at least 2 providers to compare');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Add compareOptions as string values
      Object.entries(compareOptions).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      // Add selected provider IDs
      selectedProviders.forEach((id, index) => {
        params.append(`providerIds[${index}]`, id);
      });

      const response = await fetch(`/api/vpnguidance/compare?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch comparison');
      }

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleProviderSelection = (providerId: string) => {
    setSelectedProviders(prev => {
      if (prev.includes(providerId)) {
        return prev.filter(id => id !== providerId);
      } else if (prev.length < 5) {
        return [...prev, providerId];
      } else {
        setError('You can compare up to 5 providers at once');
        return prev;
      }
    });
  };

  const removeProvider = (providerId: string) => {
    setSelectedProviders(prev => prev.filter(id => id !== providerId));
  };

  const filteredProviders = availableProviders.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProviderDetails = availableProviders.filter(p => selectedProviders.includes(p.id));

  const renderComparisonValue = (value: any, type: 'price' | 'feature' | 'rating' | 'number') => {
    switch (type) {
      case 'price':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
      case 'feature':
        return value === true ? (
          <Check className="w-5 h-5 text-success" />
        ) : value === false ? (
          <X className="w-5 h-5 text-error" />
        ) : (
          <Minus className="w-5 h-5 text-muted-foreground" />
        );
      case 'rating':
        return value ? (
          <div className="flex items-center">
            <Star className="w-4 h-4 fill-warning text-warning mr-1" />
            {value}
          </div>
        ) : (
          '-'
        );
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value || '-';
      default:
        return value || '-';
    }
  };

  const getStatusIcon = (status: StreamingCompatibility['status']) => {
    switch (status) {
      case 'WorksReliably':
        return <Check className="w-4 h-4 text-success" />;
      case 'WorksSometimes':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'DoesNotWork':
      case 'Blocked':
        return <X className="w-4 h-4 text-error" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">VPN Comparison Tool</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compare VPN providers side-by-side to find the best option for your needs. Select up to 5 providers to compare
          their features, pricing, and performance.
        </p>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Select VPN Providers to Compare
            <Badge variant="secondary">{selectedProviders.length}/5 selected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search VPN providers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Selected Providers */}
          {selectedProviders.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Selected for Comparison:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedProviderDetails.map(provider => (
                  <Badge key={provider.id} variant="default" className="pr-1">
                    {provider.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-auto p-0 w-4 h-4"
                      onClick={() => removeProvider(provider.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Provider List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredProviders.map(provider => (
              <div
                key={provider.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedProviders.includes(provider.id)
                    ? 'bg-primary/5 border-primary/30'
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleProviderSelection(provider.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      From ${Math.min(provider.monthlyPrice, provider.annualPrice / 12).toFixed(2)}/mo
                    </p>
                  </div>
                  <Checkbox
                    checked={selectedProviders.includes(provider.id)}
                    onChange={() => toggleProviderSelection(provider.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Options */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-3 block">Comparison Options:</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(compareOptions).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={value}
                    onCheckedChange={checked => setCompareOptions(prev => ({ ...prev, [key]: checked }))}
                  />
                  <Label htmlFor={key} className="text-sm">
                    {key
                      .replace('compare', '')
                      .replace(/([A-Z])/g, ' $1')
                      .trim()}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Compare Button */}
          <div className="mt-6">
            <Button onClick={fetchComparison} disabled={selectedProviders.length < 2 || loading} className="w-full">
              {loading
                ? 'Comparing...'
                : `Compare ${selectedProviders.length} Provider${selectedProviders.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-error/10 border-error/20">
          <CardContent className="p-4">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Feature</TableHead>
                    {comparison.providers.map(provider => (
                      <TableHead key={provider.id} className="text-center min-w-32">
                        {provider.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Pricing Comparison */}
                  {compareOptions.comparePrice && comparison.comparisonMatrix.price_comparison && (
                    <>
                      <TableRow className="bg-muted">
                        <TableCell colSpan={comparison.providers.length + 1} className="font-medium">
                          Pricing
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Monthly Price</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.monthlyPrice, 'price')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Annual Price (per month)</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.annualPrice / 12, 'price')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Free Trial</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {provider.hasFreeTrial ? (
                              <div className="text-success">{provider.freeTrialDays} days</div>
                            ) : (
                              <X className="w-5 h-5 text-error mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    </>
                  )}

                  {/* Features Comparison */}
                  {compareOptions.compareFeatures && (
                    <>
                      <TableRow className="bg-muted">
                        <TableCell colSpan={comparison.providers.length + 1} className="font-medium">
                          Features
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Server Count</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.serverCount, 'number')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Country Count</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.countryCount, 'number')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Kill Switch</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.hasKillSwitch, 'feature')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>No Logs Policy</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.hasNoLogsPolicy, 'feature')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>P2P Support</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.supportsP2P, 'feature')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Streaming Support</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.supportsStreaming, 'feature')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Simultaneous Connections</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {provider.maxSimultaneousConnections || 'Unlimited'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </>
                  )}

                  {/* Ratings Comparison */}
                  {compareOptions.compareRatings && (
                    <>
                      <TableRow className="bg-muted">
                        <TableCell colSpan={comparison.providers.length + 1} className="font-medium">
                          Ratings
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Overall Rating</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.overallRating, 'rating')}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Reviews</TableCell>
                        {comparison.providers.map(provider => (
                          <TableCell key={provider.id} className="text-center">
                            {renderComparisonValue(provider.totalRatings, 'number')}
                          </TableCell>
                        ))}
                      </TableRow>
                    </>
                  )}

                  {/* Streaming Comparison */}
                  {compareOptions.compareStreaming && (
                    <>
                      <TableRow className="bg-muted">
                        <TableCell colSpan={comparison.providers.length + 1} className="font-medium">
                          Streaming Compatibility
                        </TableCell>
                      </TableRow>
                      {['Netflix', 'Disney Plus', 'Amazon Prime', 'Hulu', 'BBC iPlayer'].map(service => {
                        const hasCompatibilityData = comparison.providers.some(p =>
                          p.streamingCompatibilities?.some(sc => sc.streamingServiceName === service)
                        );

                        if (!hasCompatibilityData) return null;

                        return (
                          <TableRow key={service}>
                            <TableCell>{service}</TableCell>
                            {comparison.providers.map(provider => {
                              const compat = provider.streamingCompatibilities?.find(
                                sc => sc.streamingServiceName === service
                              );
                              return (
                                <TableCell key={provider.id} className="text-center">
                                  {compat ? (
                                    getStatusIcon(compat.status)
                                  ) : (
                                    <Minus className="w-4 h-4 text-muted-foreground mx-auto" />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VpnComparison;
