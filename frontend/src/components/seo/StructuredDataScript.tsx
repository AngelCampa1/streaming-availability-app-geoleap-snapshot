'use client';

import React from 'react';

interface StructuredDataScriptProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemas: Record<string, any> | Array<Record<string, any>>;
  className?: string;
}

/**
 * Component to inject structured data (JSON-LD) scripts into the page
 * Handles both single schemas and arrays of schemas
 */
export function StructuredDataScript({ schemas, className = '' }: StructuredDataScriptProps) {
  // Ensure schemas is always an array
  const schemaArray = Array.isArray(schemas) ? schemas : [schemas];

  // Filter out null/undefined schemas
  const validSchemas = schemaArray.filter(Boolean);

  if (validSchemas.length === 0) {
    return null;
  }

  return (
    <>
      {validSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          className={className}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema, null, 0).replace(/<\/script>/gi, '<\\/script>'),
          }}
        />
      ))}
    </>
  );
}

/**
 * Wrapper component for cleaner usage with single schemas
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonLdScript({ data, className = '' }: { data: Record<string, any>; className?: string }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      className={className}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0).replace(/<\/script>/gi, '<\\/script>'),
      }}
    />
  );
}

/**
 * Higher-order component to add structured data to any page
 */
export function withStructuredData<T extends object>(
  Component: React.ComponentType<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchemas: (props: T) => Record<string, any> | Array<Record<string, any>>
) {
  return function WrappedComponent(props: T) {
    const schemas = getSchemas(props);

    return (
      <>
        <StructuredDataScript schemas={schemas} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Component {...(props as any)} />
      </>
    );
  };
}
