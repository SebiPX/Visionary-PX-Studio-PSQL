type Client = any;

async function fetchApi(url: string, options: RequestInit = {}) {
  const sessionStr = localStorage.getItem('agency_session');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch (e) {}
  }
  const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!response.ok) throw new Error('API Error');
  if (response.status !== 204) return response.json();
  return null;
}

/**
 * Get all clients with their contacts
 */
export async function getClients(): Promise<Client[]> {
  return await fetchApi('/api/clients');
}

/**
 * Get a single client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  return await fetchApi(`/api/clients/${id}`);
}

/**
 * Create a new client
 */
export async function createClient(
  clientData: Omit<Client, 'id' | 'created_at'>
): Promise<Client> {
  return await fetchApi('/api/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<Client> {
  return await fetchApi(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a client
 */
export async function deleteClient(id: string): Promise<void> {
  await fetchApi(`/api/clients/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Upload client logo to storage
 * Returns the storage path (not URL)
 */
export async function uploadClientLogo(clientId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const sessionStr = localStorage.getItem('agency_session');
  const headers: Record<string, string> = {};
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch (e) {}
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/storage/clients`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload logo');
  }

  const data = await response.json();
  return data.path || data.url || '';
}

/**
 * Get signed URL for client logo
 */
export async function getClientLogoSignedUrl(storagePath: string): Promise<string> {
  // Replace with backend generated signed URL or direct CDN link if bucket is public
  return await fetchApi(`/api/storage/signed-url?path=${encodeURIComponent(storagePath)}`)
    .then(res => res.url || storagePath)
    .catch(() => storagePath);
}

/**
 * Update client logo_url in database
 */
export async function updateClientLogo(clientId: string, logoPath: string): Promise<Client> {
  return await updateClient(clientId, { logo_url: logoPath });
}

/**
 * Delete old client logo from storage
 */
export async function deleteClientLogo(storagePath: string): Promise<void> {
  try {
    await fetchApi(`/api/storage/delete`, {
      method: 'POST',
      body: JSON.stringify({ path: storagePath })
    });
  } catch (error) {
    console.error('Error deleting old client logo:', error);
  }
}

