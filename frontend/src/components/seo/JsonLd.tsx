interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  graph?: boolean;
}

export function JsonLd({ data, graph }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data];
  const validSchemas = schemas.filter(Boolean);
  if (validSchemas.length === 0) return null;

  if (graph) {
    const graphNodes = validSchemas.map(({ '@context': _ctx, ...rest }) => rest);
    const graphObj = {
      '@context': 'https://schema.org',
      '@graph': graphNodes,
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graphObj).replace(/<\//g, '<\\/') }}
      />
    );
  }

  return (
    <>
      {validSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/<\//g, '<\\/') }}
        />
      ))}
    </>
  );
}
