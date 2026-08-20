'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

export type MatchQuality = 'Perfect' | 'Good' | 'Partial' | 'None';

interface LanguageMatchIndicatorProps {
  matchQuality: MatchQuality;
  audioLanguages: string[];
  subtitleLanguages: string[];
  className?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  sv: 'Swedish',
  pl: 'Polish',
  tr: 'Turkish',
};

const getLanguageName = (code: string): string => {
  return LANGUAGE_NAMES[code.toLowerCase()] || code;
};

export const LanguageMatchIndicator: React.FC<LanguageMatchIndicatorProps> = ({
  matchQuality,
  audioLanguages,
  subtitleLanguages,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getMatchConfig = () => {
    switch (matchQuality) {
      case 'Perfect':
        return {
          icon: CheckCircle,
          bgColor: 'bg-success/10',
          textColor: 'text-success',
          borderColor: 'border-success/30',
          label: 'Perfect Match',
          description: 'All your preferred languages are available',
        };
      case 'Good':
        return {
          icon: CheckCircle,
          bgColor: 'bg-success/5',
          textColor: 'text-success',
          borderColor: 'border-success/20',
          label: 'Good Match',
          description: 'Most of your preferred languages are available',
        };
      case 'Partial':
        return {
          icon: AlertCircle,
          bgColor: 'bg-warning/10',
          textColor: 'text-warning',
          borderColor: 'border-warning/30',
          label: 'Partial Match',
          description: 'Some of your preferred languages are available',
        };
      case 'None':
        return {
          icon: XCircle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          borderColor: 'border-destructive/30',
          label: 'No Match',
          description: 'Your preferred languages are not available',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border',
          label: 'Unknown',
          description: 'Language information not available',
        };
    }
  };

  const config = getMatchConfig();
  const Icon = config.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} hover:opacity-80 transition-opacity`}
        data-testid="language-match-indicator"
        aria-label={`${config.label}: ${config.description}`}
      >
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </button>

      {/* Tooltip/Popover */}
      {showTooltip && (audioLanguages.length > 0 || subtitleLanguages.length > 0) && (
        <div
          className="absolute z-50 w-64 p-3 mt-2 bg-background rounded-lg shadow-lg border border-border left-0"
          data-testid="language-match-tooltip"
          role="tooltip"
        >
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{config.description}</p>

            {audioLanguages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Audio Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {audioLanguages.map(lang => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                    >
                      {getLanguageName(lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {subtitleLanguages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Subtitle Languages:</p>
                <div className="flex flex-wrap gap-1">
                  {subtitleLanguages.map(lang => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent-foreground"
                    >
                      {getLanguageName(lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-6 w-2 h-2 bg-background border-l border-t border-border transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};
