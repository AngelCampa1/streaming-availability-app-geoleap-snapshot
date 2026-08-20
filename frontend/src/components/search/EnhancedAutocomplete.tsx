'use client';

import React, { useState, useEffect } from 'react';

// Type declarations for browser APIs
interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => unknown) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: Event) => unknown) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => unknown) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  transcript: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInterface;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (command: string, action: string, parameters?: Record<string, any>) => void;
  }
}
import { useAdvancedAutocomplete } from '@/hooks/useAdvancedAutocomplete';
import {
  AutocompleteSuggestion,
  AutocompleteSuggestionType,
  SUGGESTION_TYPE_CONFIG,
  DEFAULT_AUTOCOMPLETE_OPTIONS,
} from '@/lib/types/autocomplete';

interface EnhancedAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelected?: (suggestion: AutocompleteSuggestion) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  className?: string;
  maxSuggestions?: number;
  showVisualElements?: boolean;
  includeHistory?: boolean;
  includeTrending?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  enableVoiceSearch?: boolean;
  showSearchShortcuts?: boolean;
  analyticsContext?: string;
}

const EnhancedAutocomplete: React.FC<EnhancedAutocompleteProps> = ({
  value,
  onChange,
  onSuggestionSelected,
  onSubmit,
  placeholder = 'Search for movies, TV shows, actors, genres...',
  className = '',
  maxSuggestions = DEFAULT_AUTOCOMPLETE_OPTIONS.maxSuggestions,
  showVisualElements = DEFAULT_AUTOCOMPLETE_OPTIONS.showVisualElements,
  includeHistory = DEFAULT_AUTOCOMPLETE_OPTIONS.includeHistory,
  includeTrending = DEFAULT_AUTOCOMPLETE_OPTIONS.includeTrending,
  disabled = false,
  autoFocus = false,
  enableVoiceSearch = true,
  showSearchShortcuts = true,
  analyticsContext = 'search',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSearchSupported, setVoiceSearchSupported] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [micPermissionToast, setMicPermissionToast] = useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionInterface | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const {
    state,
    inputRef,
    suggestionsRef,
    updateQuery,
    selectSuggestion,
    openSuggestions,
    closeSuggestions,
    handleKeyDown,
    recentSearches: _recentSearches,  
    trendingSearches,
  } = useAdvancedAutocomplete({
    onSuggestionSelected: suggestion => {
      onChange(suggestion.text);
      onSuggestionSelected?.(suggestion);
    },
    onQueryChange: onChange,
    options: {
      maxSuggestions,
      includeHistory,
      includeTrending,
      showVisualElements,
    },
  });

  // Initialize voice search support
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceSearchSupported(true);
      const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: Event) => {
          setIsListening(false);
          // UX Fix: Show user-friendly toast for microphone permission errors
          const errorEvent = event as unknown as { error?: string };
          if (errorEvent.error === 'not-allowed' || errorEvent.error === 'permission-denied') {
            setMicPermissionToast('Microphone access denied. Please enable it in your browser settings.');
          } else if (errorEvent.error === 'no-speech') {
            setMicPermissionToast('No speech detected. Try speaking closer to the microphone.');
          } else {
            console.warn('Speech recognition error:', errorEvent.error);
          }
        };
        recognition.onresult = event => {
          const transcript = event.results[0]?.transcript;
          if (transcript) {
            onChange(transcript);
            updateQuery(transcript);
            // UX Fix: Dismiss keyboard on mobile after voice input
            inputRef.current?.blur();
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      // BUG FIX: Properly clean up SpeechRecognition to prevent memory leak
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        // Clear all event handlers to prevent memory leaks
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current = null;
      }
    };
  }, [onChange, updateQuery, inputRef]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (micPermissionToast) {
      const timer = setTimeout(() => setMicPermissionToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [micPermissionToast]);

  // UX Fix: Viewport detection for dropdown positioning (open upward if near bottom)
  useEffect(() => {
    if (state.isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 384; // max-h-96 = 24rem = 384px

      // If less than 200px below and more space above, open upward
      if (spaceBelow < Math.min(dropdownHeight, 200) && rect.top > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [state.isOpen]);

  // Sync external value with internal state
  // BUG FIX: Pass false to prevent dropdown from reopening when syncing external value
  useEffect(() => {
    if (value !== state.query) {
      updateQuery(value, false);
    }
  }, [value, state.query, updateQuery]);

  // Update character count
  useEffect(() => {
    setCharacterCount(value.length);
  }, [value]);

  // Helper functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trackSearchInteraction = React.useCallback((action: string, metadata: Record<string, any>) => {
    // Implement analytics tracking here
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: 'search',
        ...metadata,
      });
    }
  }, []);

  const startVoiceSearch = React.useCallback(() => {
    if (recognitionRef.current && voiceSearchSupported && !isListening) {
      try {
        recognitionRef.current.start();
        trackSearchInteraction('voice_search_started', { context: analyticsContext });
      } catch (e) {
        // Bug 5 fix: Handle InvalidStateError when recognition already started
        if (e instanceof DOMException && e.name === 'InvalidStateError') {
          // Stop and restart after brief delay
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch {
              // Silently ignore if restart also fails
            }
          }, 100);
        }
      }
    }
  }, [voiceSearchSupported, isListening, analyticsContext, trackSearchInteraction]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        trackSearchInteraction('shortcut_focus', { key: 'ctrl+k', context: analyticsContext });
      }

      // Alt + V for voice search
      if (event.altKey && event.key === 'v' && enableVoiceSearch && voiceSearchSupported) {
        event.preventDefault();
        if (!isListening) {
          startVoiceSearch();
        }
      }

      // Escape to close suggestions when input is focused
      if (event.key === 'Escape' && state.isOpen) {
        closeSuggestions();
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    enableVoiceSearch,
    voiceSearchSupported,
    isListening,
    state.isOpen,
    analyticsContext,
    closeSuggestions,
    inputRef,
    startVoiceSearch,
    trackSearchInteraction,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    updateQuery(newValue);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    openSuggestions();
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Delay closing to allow for click events on suggestions
    setTimeout(() => {
      closeSuggestions();
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit?.(value.trim());
      closeSuggestions();
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    selectSuggestion(suggestion);
    // UX Fix: Dismiss keyboard on mobile after selecting a suggestion
    inputRef.current?.blur();
    // Track analytics
    trackSearchInteraction('suggestion_selected', {
      suggestionType: suggestion.type,
      suggestionText: suggestion.text,
      position: state.suggestions.findIndex(s => s.text === suggestion.text),
      context: analyticsContext,
    });
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const renderSuggestionIcon = (type: AutocompleteSuggestionType) => {
    const config = SUGGESTION_TYPE_CONFIG[type];
    return (
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} mr-3 flex-shrink-0`}>
        <span className="text-sm">{config.icon}</span>
      </div>
    );
  };

  const renderSuggestionContent = (suggestion: AutocompleteSuggestion) => {
    const config = SUGGESTION_TYPE_CONFIG[suggestion.type];

    return (
      <div className="flex items-center flex-1 min-w-0">
        {showVisualElements && renderSuggestionIcon(suggestion.type)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground truncate">{suggestion.text}</span>
            {suggestion.estimatedResults > 0 && (
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {suggestion.estimatedResults.toLocaleString()} results
              </span>
            )}
          </div>

          <div className="flex items-center mt-1">
            <span className={`text-xs ${config.color} mr-2`}>{config.label}</span>

            {suggestion.year && <span className="text-xs text-muted-foreground mr-2">{suggestion.year}</span>}

            {suggestion.rating && <span className="text-xs text-muted-foreground mr-2">⭐ {suggestion.rating.toFixed(1)}</span>}

            {suggestion.genres.length > 0 && (
              <span className="text-xs text-muted-foreground truncate">{suggestion.genres.slice(0, 2).join(', ')}</span>
            )}

            {(suggestion.metadata?.isRising as boolean) && (
              <span className="text-xs text-destructive ml-2 font-medium">🔥 Trending</span>
            )}
          </div>
        </div>

        {showVisualElements && suggestion.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.posterUrl}
            alt={suggestion.text}
            className="w-10 h-14 object-cover rounded ml-3 flex-shrink-0"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
    );
  };

  const renderEmptyState = () => {
    if (state.isLoading) {
      return (
        <div className="px-4 py-3 text-center text-sm text-muted-foreground">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          Loading suggestions...
        </div>
      );
    }

    if (state.error) {
      return <div className="px-4 py-3 text-center text-sm text-destructive">{state.error}</div>;
    }

    if (value.length < 2) {
      return (
        <div className="px-4 py-4">
          <div className="text-sm font-medium text-foreground mb-3">🔥 Popular searches</div>
          <div className="space-y-1 mb-4">
            {trendingSearches.slice(0, 3).map((trending, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  const suggestion: AutocompleteSuggestion = {
                    text: trending.query,
                    type: AutocompleteSuggestionType.Trending,
                    score: trending.trendingScore,
                    estimatedResults: Math.floor(trending.searchCount / 10),
                    genres: [],
                    metadata: { isRising: trending.isRising },
                  };
                  handleSuggestionClick(suggestion);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg transition-all duration-150 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-destructive mr-2 text-base">🔥</span>
                    <span className="font-medium">{trending.query}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {trending.isRising && (
                      <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">Rising</span>
                    )}
                    <span className="text-xs text-muted-foreground">{Math.floor(trending.searchCount / 10)} results</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-muted-foreground mb-2 font-medium">💡 Search tips:</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Try &quot;Marvel movies&quot; or &quot;Comedy TV shows&quot;</div>
              <div>• Search by actor: &quot;Tom Hanks movies&quot;</div>
              <div>• Find by year: &quot;2023 action movies&quot;</div>
              {enableVoiceSearch && voiceSearchSupported && <div>• Use voice search for hands-free input</div>}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-3 text-center text-sm text-muted-foreground">No suggestions found for &ldquo;{value}&rdquo;</div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* UX Fix: Microphone Permission Toast */}
      {micPermissionToast && (
        <div
          className="absolute -top-14 left-0 right-0 z-20 animate-in slide-in-from-top duration-300"
          role="alert"
        >
          <div className="bg-warning text-warning-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center justify-between">
            <span>{micPermissionToast}</span>
            <button
              onClick={() => setMicPermissionToast(null)}
              className="ml-3 p-1 hover:bg-warning-foreground/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Search Hint */}
      {showSearchShortcuts && (
        <div className="hidden max-sm:block mb-2 text-xs text-muted-foreground text-center">
          Tip: Pull down to refresh suggestions, use voice search for hands-free input
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            maxLength={200}
            aria-label="Search for movies, TV shows, and content"
            aria-expanded={state.isOpen}
            aria-haspopup="listbox"
            aria-activedescendant={state.selectedIndex >= 0 ? `suggestion-${state.selectedIndex}` : undefined}
            aria-controls="suggestions-listbox"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            className={`
              w-full px-4 py-3 pl-12 pr-32 text-lg
              sm:text-base md:text-lg
              border-2 transition-all duration-300 rounded-lg
              bg-card/80 backdrop-blur-sm
              ${
                isFocused || state.isOpen
                  ? 'border-primary ring-4 ring-primary/20 shadow-xl scale-[1.01] transform translate-y-[-1px]'
                  : 'border-border hover:border-border/80 hover:shadow-md hover:scale-[1.005]'
              }
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${state.isOpen && dropdownPosition === 'bottom' ? 'rounded-b-none border-b-0' : ''}
              ${state.isOpen && dropdownPosition === 'top' ? 'rounded-t-none border-t-0' : ''}
              ${isListening ? 'bg-destructive/10 border-destructive/30 ring-destructive/20 animate-pulse' : ''}
              touch-manipulation
              min-h-[48px] sm:min-h-[44px]
              placeholder-muted-foreground/50
            `}
          />

          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className={`h-6 w-6 transition-colors ${isFocused || state.isOpen ? 'text-primary' : 'text-muted-foreground'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Action Buttons Container */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
            {/* Character Counter */}
            {characterCount > 150 && (
              <span
                className={`text-xs px-2 py-1 rounded ${
                  characterCount > 190 ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10'
                }`}
              >
                {200 - characterCount}
              </span>
            )}

            {/* Voice Search Button */}
            {enableVoiceSearch && voiceSearchSupported && (
              <button
                type="button"
                onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                disabled={disabled}
                className={`
                  p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary
                  ${
                    isListening
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={isListening ? 'Stop voice search' : 'Start voice search'}
                aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  {isListening ? (
                    <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H6c0 3.53 2.61 6.43 6 6.92V21h4v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  ) : (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  )}
                </svg>
              </button>
            )}

            {/* Search Button */}
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className={`
                px-4 py-2 rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
                ${
                  value.trim() && !disabled
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground transform hover:scale-105'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }
                disabled:opacity-50 disabled:transform-none
              `}
              aria-label="Submit search"
            >
              Search
            </button>
          </div>

          {/* Loading Indicator */}
          {state.isLoading && (
            <div className="absolute inset-y-0 right-16 flex items-center pr-3">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown - with viewport-aware positioning */}
      {/* BUG FIX: Added pointer-events handling and improved z-index layering */}
      {state.isOpen && (
        <div
          ref={suggestionsRef}
          className={`absolute z-40 w-full bg-card border-2 border-primary shadow-2xl max-h-96 overflow-y-auto ${
            dropdownPosition === 'top'
              ? 'bottom-full mb-1 rounded-t-lg border-b-0'
              : 'top-full border-t-0 rounded-b-lg'
          }`}
          role="listbox"
          aria-label="Search suggestions"
          onMouseDown={e => {
            // BUG FIX: Prevent blur when clicking inside dropdown to allow suggestion clicks
            e.preventDefault();
          }}
        >
          {state.suggestions.length > 0 ? (
            <div className="py-2">
              {state.suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  id={`suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={state.selectedIndex === index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`
                    w-full text-left px-4 py-3 transition-all duration-150
                    hover:bg-primary/10 focus:bg-primary/10 focus:outline-none
                    ${
                      state.selectedIndex === index
                        ? 'bg-primary/10 border-l-4 border-l-primary transform translate-x-1'
                        : 'hover:translate-x-0.5'
                    }
                  `}
                >
                  {renderSuggestionContent(suggestion)}
                </button>
              ))}
            </div>
          ) : (
            renderEmptyState()
          )}

          {/* Footer with keyboard shortcuts hint */}
          <div className="border-t border-border px-4 py-2 bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-muted border rounded text-xs mr-1">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-muted border rounded text-xs mr-1">Enter</kbd>
                  select
                </span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-muted border rounded text-xs mr-1">Esc</kbd>
                  close
                </span>
              </div>
              {showSearchShortcuts && (
                <div className="flex items-center space-x-2">
                  <span className="flex items-center">
                    <kbd className="px-2 py-1 bg-muted border rounded text-xs mr-1">Ctrl+K</kbd>
                    focus
                  </span>
                  {enableVoiceSearch && voiceSearchSupported && (
                    <span className="flex items-center">
                      <kbd className="px-2 py-1 bg-muted border rounded text-xs mr-1">Alt+V</kbd>
                      voice
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAutocomplete;
