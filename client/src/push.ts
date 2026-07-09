export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribePush(
  swReg: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription | null> {
  if (!("PushManager" in window)) return null;
  try {
    const sub = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    return sub;
  } catch {
    return null;
  }
}

export async function unsubscribePush(swReg: ServiceWorkerRegistration): Promise<void> {
  const sub = await swReg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
  }
}
