// Utility function to get the correct API base URL
export const getApiBaseUrl = () => {
  // Check if we're in production (Vercel)
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  return process.env.FRONTEND_URL || 'https://vibraniumekc.vercel.app';
};

// Helper function to make API calls with correct base URL
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response;
};
