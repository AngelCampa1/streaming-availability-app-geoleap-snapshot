/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  User,
  MessageCircle,
  Calendar,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  HeartHandshake,
} from 'lucide-react';

interface VpnRating {
  id: string;
  vpnProviderId: string;
  userId: string;
  ratingType: 'ThumbsUpDown' | 'FiveStars';
  rating: number;
  review?: string;
  speedRating?: number;
  reliabilityRating?: number;
  easeOfUseRating?: number;
  customerSupportRating?: number;
  valueForMoneyRating?: number;
  createdAt: string;
  updatedAt?: string;
  isVerified: boolean;
  isHelpful: boolean;
  helpfulVotes: number;
  unhelpfulVotes: number;
  user: {
    id: string;
    username?: string;
    email: string;
  };
}

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  categoryAverages: {
    speed: number;
    reliability: number;
    easeOfUse: number;
    customerSupport: number;
  };
}

interface VpnRatingSystemProps {
  vpnProviderId: string;
  vpnProviderName: string;
  currentUserRating?: VpnRating;
  isAuthenticated: boolean;
  onSubmitRating?: (rating: any) => void;
  onVoteHelpfulness?: (ratingId: string, isHelpful: boolean) => void;
}

export const VpnRatingSystem: React.FC<VpnRatingSystemProps> = ({
  vpnProviderId,
  vpnProviderName,
  currentUserRating,
  isAuthenticated,
  onSubmitRating,
  onVoteHelpfulness,
}) => {
  const [ratings, setRatings] = useState<VpnRating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [_ratingType, _setRatingType] = useState<'ThumbsUpDown' | 'FiveStars'>('FiveStars');

  // Rating form state
  const [overallRating, setOverallRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [reliabilityRating, setReliabilityRating] = useState(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState(0);
  const [customerSupportRating, setCustomerSupportRating] = useState(0);
  const [valueForMoneyRating, setValueForMoneyRating] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    loadRatings();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpnProviderId]);

  useEffect(() => {
    if (currentUserRating) {
      setOverallRating(currentUserRating.rating);
      setSpeedRating(currentUserRating.speedRating || 0);
      setReliabilityRating(currentUserRating.reliabilityRating || 0);
      setEaseOfUseRating(currentUserRating.easeOfUseRating || 0);
      setCustomerSupportRating(currentUserRating.customerSupportRating || 0);
      setValueForMoneyRating(currentUserRating.valueForMoneyRating || 0);
      setReview(currentUserRating.review || '');
    }
  }, [currentUserRating]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vpnproviders/${vpnProviderId}/ratings`);
      if (response.ok) {
        const data = await response.json();
        setRatings(data);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/vpnproviders/${vpnProviderId}/ratings/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading rating stats:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!isAuthenticated || !onSubmitRating) return;

    const ratingData = {
      vpnProviderId,
      ratingType: _ratingType,
      rating: _ratingType === 'ThumbsUpDown' ? (overallRating > 3 ? 1 : 0) : overallRating,
      review: review.trim() || undefined,
      speedRating: speedRating > 0 ? speedRating : undefined,
      reliabilityRating: reliabilityRating > 0 ? reliabilityRating : undefined,
      easeOfUseRating: easeOfUseRating > 0 ? easeOfUseRating : undefined,
      customerSupportRating: customerSupportRating > 0 ? customerSupportRating : undefined,
      valueForMoneyRating: valueForMoneyRating > 0 ? valueForMoneyRating : undefined,
    };

    await onSubmitRating(ratingData);
    setShowRatingForm(false);
    loadRatings();
    loadStats();
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating;
      stars.push(
        <button
          key={i}
          type="button"
          className={`${interactive ? 'hover:scale-110 transition-transform' : 'cursor-default'}`}
          onClick={() => interactive && onRate && onRate(i)}
          disabled={!interactive}
        >
          <Star className={`w-5 h-5 ${filled ? 'fill-warning text-warning' : 'text-muted'}`} />
        </button>
      );
    }

    return <div className="flex items-center gap-1">{stars}</div>;
  };

  const renderRatingDistribution = () => {
    if (!stats) return null;

    const total = stats.totalRatings;
    const distribution = stats.ratingDistribution;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(star => {
          const count = distribution[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 w-16">
                <span>{star}</span>
                <Star className="w-3 h-3 fill-warning text-warning" />
              </div>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-warning h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-muted-foreground w-12 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderThumbsVoting = (rating: VpnRating) => {
    return (
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-success"
          onClick={() => onVoteHelpfulness?.(rating.id, true)}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{rating.helpfulVotes}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => onVoteHelpfulness?.(rating.id, false)}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{rating.unhelpfulVotes}</span>
        </Button>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              User Ratings for {vpnProviderName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground mb-2">{stats.averageRating.toFixed(1)}</div>
                  <div className="flex items-center justify-center mb-2">
                    {renderStars(Math.round(stats.averageRating))}
                  </div>
                  <p className="text-muted-foreground">Based on {stats.totalRatings.toLocaleString()} reviews</p>
                </div>

                {/* Category Ratings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm">Speed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(stats.categoryAverages.speed))}
                      <span className="text-sm text-muted-foreground">{stats.categoryAverages.speed.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success" />
                      <span className="text-sm">Reliability</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(stats.categoryAverages.reliability))}
                      <span className="text-sm text-muted-foreground">{stats.categoryAverages.reliability.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-accent-foreground" />
                      <span className="text-sm">Ease of Use</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(stats.categoryAverages.easeOfUse))}
                      <span className="text-sm text-muted-foreground">{stats.categoryAverages.easeOfUse.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-warning" />
                      <span className="text-sm">Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(stats.categoryAverages.customerSupport))}
                      <span className="text-sm text-muted-foreground">{stats.categoryAverages.customerSupport.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div>
                <h4 className="font-medium text-foreground mb-4">Rating Distribution</h4>
                {renderRatingDistribution()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Rating */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Rate This VPN Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {!showRatingForm ? (
              <div className="text-center">
                {currentUserRating ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">You rated this provider:</p>
                    <div className="flex items-center justify-center">{renderStars(currentUserRating.rating)}</div>
                    {currentUserRating.review && (
                      <p className="text-sm text-foreground italic">&quot;{currentUserRating.review}&quot;</p>
                    )}
                    <Button onClick={() => setShowRatingForm(true)}>Update Rating</Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-4">Share your experience with this VPN provider</p>
                    <Button onClick={() => setShowRatingForm(true)}>Write a Review</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Overall Rating *</label>
                  {renderStars(overallRating, true, setOverallRating)}
                </div>

                {/* Category Ratings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Zap className="w-4 h-4 inline mr-1" />
                      Speed
                    </label>
                    {renderStars(speedRating, true, setSpeedRating)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Reliability
                    </label>
                    {renderStars(reliabilityRating, true, setReliabilityRating)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Ease of Use
                    </label>
                    {renderStars(easeOfUseRating, true, setEaseOfUseRating)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <HeartHandshake className="w-4 h-4 inline mr-1" />
                      Customer Support
                    </label>
                    {renderStars(customerSupportRating, true, setCustomerSupportRating)}
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Review (Optional)</label>
                  <Textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Share your experience with this VPN provider..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleSubmitRating} disabled={overallRating === 0} className="flex-1">
                    {currentUserRating ? 'Update Review' : 'Submit Review'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowRatingForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Recent Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reviews...</div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {ratings.map(rating => (
                <div key={rating.id} className="border-b border-border pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{rating.user.username || 'Anonymous User'}</span>
                          {rating.isVerified && (
                            <Badge variant="outline" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(rating.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">{renderStars(rating.rating)}</div>
                  </div>

                  {/* Category Ratings */}
                  {(rating.speedRating ||
                    rating.reliabilityRating ||
                    rating.easeOfUseRating ||
                    rating.customerSupportRating) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      {rating.speedRating && (
                        <div className="text-xs">
                          <div className="text-muted-foreground">Speed</div>
                          <div className="flex items-center gap-1">{renderStars(rating.speedRating)}</div>
                        </div>
                      )}
                      {rating.reliabilityRating && (
                        <div className="text-xs">
                          <div className="text-muted-foreground">Reliability</div>
                          <div className="flex items-center gap-1">{renderStars(rating.reliabilityRating)}</div>
                        </div>
                      )}
                      {rating.easeOfUseRating && (
                        <div className="text-xs">
                          <div className="text-muted-foreground">Ease of Use</div>
                          <div className="flex items-center gap-1">{renderStars(rating.easeOfUseRating)}</div>
                        </div>
                      )}
                      {rating.customerSupportRating && (
                        <div className="text-xs">
                          <div className="text-muted-foreground">Support</div>
                          <div className="flex items-center gap-1">{renderStars(rating.customerSupportRating)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Text */}
                  {rating.review && <p className="text-foreground mb-3">{rating.review}</p>}

                  {/* Helpfulness Voting */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Was this review helpful?</p>
                    {renderThumbsVoting(rating)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VpnRatingSystem;
