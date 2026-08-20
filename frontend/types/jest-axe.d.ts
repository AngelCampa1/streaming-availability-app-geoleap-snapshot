// Consolidated jest-axe type definitions - resolves duplicate exports
declare module 'jest-axe' {
  interface AxeResults {
    violations: Array<{
      id: string;
      impact?: string;
      tags?: string[];
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        target: string[];
        html: string;
        impact?: string;
        any: any[];
        all: any[];
        none: any[];
        failureSummary?: string;
      }>;
    }>;
    incomplete?: Array<{
      id: string;
      impact?: string;
      description: string;
      help: string;
      helpUrl: string;
    }>;
    passes?: Array<{
      id: string;
      impact?: string;
      description: string;
      help: string;
      helpUrl: string;
    }>;
    inapplicable?: Array<{
      id: string;
      impact?: string;
      description: string;
      help: string;
      helpUrl: string;
    }>;
    url?: string;
    timestamp?: string;
  }

  interface CustomMatcherResult {
    pass: boolean;
    message: () => string;
  }

  export function axe(element?: Element | Document, options?: any): Promise<AxeResults>;
  export function toHaveNoViolations(): CustomMatcherResult;
  export { axe as default };
}

// Extend Jest matchers - single global declaration
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}