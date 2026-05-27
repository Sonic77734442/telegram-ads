export async function fetchCampaignById(id: string) {
  const response = await fetch(`/api/campaign?id=${encodeURIComponent(id)}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Failed to load campaign (${response.status})`);
  }

  const payload = await response.json();
  return payload.data;
}
