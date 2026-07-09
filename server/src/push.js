import webpush from "web-push";

export function initPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.log("VAPID keys not set — push notifications disabled");
    return false;
  }
  webpush.setVapidDetails("mailto:boltalka@localhost", pub, priv);
  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function sendNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410) return { expired: true };
    return { success: false, error: err.message };
  }
}
