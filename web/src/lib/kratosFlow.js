import { KRATOS_URL } from './app'

/*
  Kratos self-service akışları (login, registration, verification) için ortak yardımcılar.
  Akış bozulabilir: süresi dolar (10 dk), silinir, başka tarayıcıya aittir, kullanıcı zaten girişlidir.
  Sayfalar bu durumları tek tek bilmez; classifyFlowError ne yapılacağını söyler, sayfa uygular.
*/

export const csrfOf = (flow) => flow?.ui?.nodes?.find((n) => n.attributes?.name === 'csrf_token')?.attributes?.value

// Yeni akış: tarayıcı Kratos'a gider, Kratos yeni ?flow= ile ui_url'e (ör. /login) geri yollar.
export const browserFlowUrl = (kind) => `${KRATOS_URL}/self-service/${kind}/browser`

const json = async (res) => {
  try { return await res.json() } catch { return null }
}

// Akışı okur. Başarısızsa flow yerine karar döner — hata gövdesi asla "akış" diye saklanmaz.
export async function getFlow(kind, id) {
  const res = await fetch(`${KRATOS_URL}/self-service/${kind}/flows?id=${encodeURIComponent(id)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const body = await json(res)
  if (res.ok && body?.id) return { flow: body }
  return { decision: classifyFlowError(res.status, body) }
}

// Akışa JSON gönderir; tarayıcı akışı olduğu için cookie (oturum + CSRF) her istekte gider.
export async function submitFlow(kind, flowId, payload) {
  const res = await fetch(`${KRATOS_URL}/self-service/${kind}?flow=${encodeURIComponent(flowId)}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: res.ok, status: res.status, body: await json(res) }
}

/*
  Başarısız cevaba ne yapılacağı:
    { action: 'show' }                 → form hatası (yanlış şifre vb.); gövdedeki güncel akışla devam
    { action: 'use_flow', flowId }     → süresi doldu; Kratos'un verdiği yeni akışa geç
    { action: 'restart' }              → akış kullanılamaz (bulunamadı, CSRF, bozuk); baştan yeni akış
    { action: 'go_app' }               → kullanıcı zaten girişli
    { action: 'redirect', url }        → Kratos tarayıcının başka adrese gitmesini istiyor
*/
export function classifyFlowError(status, body) {
  const id = body?.error?.id

  if (id === 'session_already_available') return { action: 'go_app' }

  if (status === 422 && body?.redirect_browser_to) return { action: 'redirect', url: body.redirect_browser_to }

  if (status === 410 || id === 'self_service_flow_expired') {
    const flowId = body?.use_flow_id ?? body?.error?.details?.use_flow_id
    return flowId ? { action: 'use_flow', flowId } : { action: 'restart' }
  }

  // Gövde güncel akışı taşıyorsa (ui alanı) bu bir form hatasıdır — akış sağlam.
  if (status === 400 && body?.ui) return { action: 'show' }

  // 404 (bulunamadı), 403 (CSRF / başka tarayıcı), gövdesiz 400 (bozuk akış kimliği) ve benzerleri
  if (status === 400 || status === 403 || status === 404) return { action: 'restart' }

  return { action: 'show' }
}
