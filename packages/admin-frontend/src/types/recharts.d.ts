// Temporary type shim for environments where recharts types are not resolved
// This prevents `tsc` from failing during CI builds (e.g., Netlify) when
// the `recharts` package's type declarations are not found.

declare module 'recharts';
