/**
 * Re-export useAuth hook from AuthContext for convenience
 * The actual implementation is in ../context/AuthContext.tsx
 */

export { useAuth, useIsAuthenticated, useCurrentUser } from '../context/AuthContext';
export default useAuth;

// Import to make default work
import { useAuth } from '../context/AuthContext';
