// Simple API client with auth + JSON handling
export function createApi(token, baseUrl = import.meta?.env?.VITE_API_BASE || 'http://localhost:4000') {
  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });

  async function handle(res) {
    const text = await res.text();
    let data = null;
    
    // Try to parse as JSON, fallback to text if HTML/non-JSON
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      // If parse fails and response is not ok, likely HTML error page
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.data = { error: text.substring(0, 200) }; // Include first 200 chars of HTML for debugging
        throw err;
      }
      // If response is ok but not JSON, return text as-is
      return { text };
    }
    
    if (!res.ok) {
      const err = new Error(data?.error || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    baseUrl,
    get: (path) => fetch(`${baseUrl}${path}`, { headers: headers() }).then(handle),
    post: (path, body) => fetch(`${baseUrl}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
    put: (path, body) => fetch(`${baseUrl}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
    del: (path) => fetch(`${baseUrl}${path}`, { method: 'DELETE', headers: headers() }).then(handle)
  };
}
