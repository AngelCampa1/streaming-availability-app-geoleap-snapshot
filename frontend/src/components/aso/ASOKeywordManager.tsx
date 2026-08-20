import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KeywordPerformanceData } from './ASOAnalyticsDashboard';

export interface ASOKeywordManagerProps {
  appId: string;
  keywords?: KeywordPerformanceData[];
  onKeywordUpdate?: (keywords: KeywordPerformanceData[]) => void;
  onKeywordAdd?: (keyword: KeywordPerformanceData) => void;
  onKeywordRemove?: (keywordId: string) => void;
}

const ASOKeywordManager: React.FC<ASOKeywordManagerProps> = ({
  appId: _appId,
  keywords = [],
  onKeywordUpdate,
  onKeywordAdd,
  onKeywordRemove,
}) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<KeywordPerformanceData[]>([]);
  const [managedKeywords, setManagedKeywords] = useState<KeywordPerformanceData[]>(keywords);

  useEffect(() => {
    setManagedKeywords(keywords);
  }, [keywords]);

  const searchKeywordSuggestions = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);

    // Simulate API call for keyword suggestions
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockSuggestions: KeywordPerformanceData[] = [
      {
        id: `suggestion-1`,
        keyword: `${searchTerm} vpn`,
        appStore: 'iOS',
        country: 'US',
        ranking: Math.floor(Math.random() * 50) + 1,
        searchVolume: Math.floor(Math.random() * 10000) + 1000,
        competition: Math.random(),
        trend: 'up',
      },
      {
        id: `suggestion-2`,
        keyword: `best ${searchTerm}`,
        appStore: 'Android',
        country: 'US',
        ranking: Math.floor(Math.random() * 50) + 1,
        searchVolume: Math.floor(Math.random() * 8000) + 500,
        competition: Math.random(),
        trend: 'stable',
      },
      {
        id: `suggestion-3`,
        keyword: `${searchTerm} streaming`,
        appStore: 'iOS',
        country: 'US',
        ranking: Math.floor(Math.random() * 30) + 1,
        searchVolume: Math.floor(Math.random() * 15000) + 2000,
        competition: Math.random(),
        trend: 'down',
      },
    ];

    setSuggestions(mockSuggestions);
    setLoading(false);
  };

  const addKeyword = (keyword: KeywordPerformanceData) => {
    const newKeyword = { ...keyword, id: `keyword-${Date.now()}-${Math.random()}` };
    const updatedKeywords = [...managedKeywords, newKeyword];
    setManagedKeywords(updatedKeywords);

    if (onKeywordAdd) {
      onKeywordAdd(newKeyword);
    }

    if (onKeywordUpdate) {
      onKeywordUpdate(updatedKeywords);
    }

    // Remove from suggestions
    setSuggestions(suggestions.filter(s => s.keyword !== keyword.keyword));
  };

  const removeKeyword = (keywordId: string) => {
    const updatedKeywords = managedKeywords.filter(k => k.id !== keywordId);
    setManagedKeywords(updatedKeywords);

    if (onKeywordRemove) {
      onKeywordRemove(keywordId);
    }

    if (onKeywordUpdate) {
      onKeywordUpdate(updatedKeywords);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-error" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCompetitionColor = (competition: number) => {
    if (competition > 0.7) return 'bg-[hsl(var(--chart-2))]'; // High competition - Red
    if (competition > 0.4) return 'bg-[hsl(var(--chart-4))]'; // Medium competition - Yellow/Warning
    return 'bg-[hsl(var(--chart-3))]'; // Low competition - Green
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Research & Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search for keyword ideas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchKeywordSuggestions()}
            />
            <Button onClick={searchKeywordSuggestions} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Keyword Suggestions</h4>
              <div className="space-y-2">
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{suggestion.keyword}</span>
                      {getTrendIcon(suggestion.trend)}
                      <Badge variant="outline">Vol: {suggestion.searchVolume.toLocaleString()}</Badge>
                      <Badge variant="outline">Rank: #{suggestion.ranking}</Badge>
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-8 rounded ${getCompetitionColor(suggestion.competition)}`} />
                        <span className="text-xs">{Math.round(suggestion.competition * 100)}% comp</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addKeyword(suggestion)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Managed Keywords ({managedKeywords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {managedKeywords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No keywords managed yet. Use the search above to find and add keywords.
            </p>
          ) : (
            <div className="space-y-2">
              {managedKeywords.map(keyword => (
                <div key={keyword.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{keyword.keyword}</span>
                    {getTrendIcon(keyword.trend)}
                    <Badge variant="outline">{keyword.appStore}</Badge>
                    <Badge variant="outline">{keyword.country}</Badge>
                    <Badge variant="outline">Vol: {keyword.searchVolume.toLocaleString()}</Badge>
                    <Badge variant="outline">Rank: #{keyword.ranking}</Badge>
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-8 rounded ${getCompetitionColor(keyword.competition)}`} />
                      <span className="text-xs">{Math.round(keyword.competition * 100)}% comp</span>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => removeKeyword(keyword.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ASOKeywordManager;
