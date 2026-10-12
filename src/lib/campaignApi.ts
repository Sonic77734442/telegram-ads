export async function accountRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 401) throw new Error("Сессия истекла. Войдите в кабинет заново.");
  if (!response.ok) throw new Error(payload?.error || "Не удалось выполнить запрос. Попробуйте ещё раз.");
  if (!payload) throw new Error("Сервер вернул некорректный ответ. Попробуйте ещё раз.");
  return payload;
}

export async function fetchCampaignById(id: string) {
  return (await accountRequest(`/api/campaign?id=${encodeURIComponent(id)}`)).data;
}

const pendingCreates = new Map<string,string>();
export async function saveCampaign(values: Record<string, unknown>, id?: string) {
  const body=JSON.stringify(values);
  if(!id&&!pendingCreates.has(body))pendingCreates.set(body,crypto.randomUUID());
  const result=await accountRequest(id ? `/api/campaign?id=${encodeURIComponent(id)}` : '/api/campaign', {
    method:id?'PATCH':'POST',body,headers:id?{}:{'Idempotency-Key':pendingCreates.get(body)!},
  });
  pendingCreates.delete(body);window.dispatchEvent(new Event('account-balance-changed'));return result.data;
}
export async function deleteCampaign(id: string) {
 const result=await accountRequest(`/api/campaign?id=${encodeURIComponent(id)}`,{method:'DELETE'});
 window.dispatchEvent(new Event('account-balance-changed'));return result;
}

export async function fetchAccountBalance(): Promise<{balance: number; markup_percent: number}> {
  return accountRequest("/api/campaigns-budget");
}
