// Basic TypeScript file to test compilation
function getFrontendUrl(): string {
  return "http://localhost:3000";
}

function handleAuthCallback(success: boolean): string {
  return `${getFrontendUrl()}/auth/callback?success=${success}`;
}

// Export to avoid unused variable warnings
export { getFrontendUrl, handleAuthCallback };