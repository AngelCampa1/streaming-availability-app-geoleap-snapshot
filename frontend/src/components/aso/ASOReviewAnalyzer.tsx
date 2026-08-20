import React, { useState, useEffect } from 'react';
import { designTokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, TrendingDown, MessageSquare, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export interface ReviewData {
  id: string;
  text: string;
  rating: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  platform: 'ios' | 'android';
  date: string;
  language?: string;
  verified?: boolean;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ASOReviewAnalyzerProps {
  appId: string;
  reviews?: ReviewData[];
  onSentimentAnalyzed?: (analysis: SentimentDistribution) => void;
  autoRefresh?: boolean;
}

const ASOReviewAnalyzer: React.FC<ASOReviewAnalyzerProps> = ({
  appId: _appId,
  reviews = [],
  onSentimentAnalyzed,
  autoRefresh = false,
}) => {
  const [_loading, setLoading] = useState(false);
  const [analyzedReviews, setAnalyzedReviews] = useState<ReviewData[]>(reviews);
  const [sentimentDistribution, setSentimentDistribution] = useState<SentimentDistribution>({
    positive: 0,
    neutral: 0,
    negative: 0,
  });
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [keywordFrequency, setKeywordFrequency] = useState<{ [key: string]: number }>({});

  // Analyze reviews
  const analyzeReviews = async () => {
    if (analyzedReviews.length === 0) return;

    setLoading(true);

    // Calculate sentiment distribution
    const total = analyzedReviews.length;
    const positive = analyzedReviews.filter(r => r.sentiment === 'positive').length;
    const negative = analyzedReviews.filter(r => r.sentiment === 'negative').length;
    const neutral = total - positive - negative;

    const distribution = {
      positive: positive / total,
      neutral: neutral / total,
      negative: negative / total,
    };

    setSentimentDistribution(distribution);

    // Calculate average rating
    const avgRating = analyzedReviews.reduce((sum, r) => sum + r.rating, 0) / total;
    setAverageRating(Math.round(avgRating * 10) / 10);
    setTotalReviews(total);

    // Extract keyword frequency
    const keywords: { [key: string]: number } = {};
    analyzedReviews.forEach(review => {
      const words = review.text.toLowerCase().split(/\W+/);
      words.forEach(word => {
        if (word.length > 3) {
          // Only count words longer than 3 characters
          keywords[word] = (keywords[word] || 0) + 1;
        }
      });
    });

    // Get top keywords
    const topKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    setKeywordFrequency(topKeywords);

    if (onSentimentAnalyzed) {
      onSentimentAnalyzed(distribution);
    }

    setLoading(false);
  };

  useEffect(() => {
    setAnalyzedReviews(reviews);
  }, [reviews]);

  useEffect(() => {
    if (analyzedReviews.length > 0) {
      analyzeReviews();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedReviews]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // In a real app, this would fetch new reviews
        analyzeReviews();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'hsl(var(--chart-3))'; // Green
      case 'negative':
        return 'hsl(var(--chart-2))'; // Red
      default:
        return 'hsl(var(--muted-foreground))'; // Neutral
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-warning text-warning' : 'text-muted'}`} />
    ));
  };

  const sentimentPieData = [
    { name: 'Positive', value: sentimentDistribution.positive * 100, color: 'hsl(var(--chart-3))' },
    { name: 'Neutral', value: sentimentDistribution.neutral * 100, color: 'hsl(var(--muted-foreground))' },
    { name: 'Negative', value: sentimentDistribution.negative * 100, color: 'hsl(var(--chart-2))' },
  ];

  const keywordBarData = Object.entries(keywordFrequency).map(([word, count]) => ({
    word,
    count,
  }));

  if (analyzedReviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Review Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No reviews available for analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3" /> +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating}</div>
            <div className="flex items-center mt-1">{getRatingStars(Math.round(averageRating))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((sentimentDistribution.positive - sentimentDistribution.negative) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {sentimentDistribution.positive > sentimentDistribution.negative ? (
                <TrendingUp className="inline h-3 w-3" />
              ) : (
                <TrendingDown className="inline h-3 w-3" />
              )}{' '}
              Overall sentiment trend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Positive Reviews</span>
                  <span className="text-sm">{Math.round(sentimentDistribution.positive * 100)}%</span>
                </div>
                <Progress value={sentimentDistribution.positive * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Neutral Reviews</span>
                  <span className="text-sm">{Math.round(sentimentDistribution.neutral * 100)}%</span>
                </div>
                <Progress value={sentimentDistribution.neutral * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Negative Reviews</span>
                  <span className="text-sm">{Math.round(sentimentDistribution.negative * 100)}%</span>
                </div>
                <Progress value={sentimentDistribution.negative * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Most Mentioned Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={keywordBarData}>
                <XAxis dataKey="word" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={designTokens.brand.primary[500]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyzedReviews.slice(0, 5).map(review => (
              <div key={review.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">{getRatingStars(review.rating)}</div>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: getSentimentColor(review.sentiment),
                        color: getSentimentColor(review.sentiment),
                      }}
                    >
                      {review.sentiment}
                    </Badge>
                    <Badge variant="outline">{review.platform}</Badge>
                    {review.verified && (
                      <Badge variant="outline" className="text-success border-success">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{review.date}</span>
                </div>
                <p className="text-sm">{review.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ASOReviewAnalyzer;
