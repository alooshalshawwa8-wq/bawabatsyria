import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rawUrl = process.env.OFOQ_PRIVATE_SITE_URL ?? "";
let privateUrl;
try {
  privateUrl = new URL(rawUrl);
} catch {
  throw new Error("OFOQ_PRIVATE_SITE_URL must be the final HTTPS Cloudflare Pages hostname.");
}
if (
  privateUrl.protocol !== "https:" ||
  !/^[a-z0-9-]+\.pages\.dev$/i.test(privateUrl.hostname) ||
  privateUrl.pathname !== "/" ||
  privateUrl.search ||
  privateUrl.hash
) {
  throw new Error("OFOQ_PRIVATE_SITE_URL must be an exact https://<project>.pages.dev origin.");
}

const output = resolve("dist-retirement");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Cache-Control" content="no-store">
<title>أُفُق | انتقل إلى المساحة الخاصة</title>
<style>
:root{color-scheme:dark;font-family:Tahoma,"Segoe UI",sans-serif;background:#091426;color:#f5f7fb}
*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#1c3152,#091426 65%)}
main{width:min(100%,620px);padding:32px;border:1px solid #826a3b;border-radius:22px;background:#101f35;text-align:center;box-shadow:0 20px 70px #0006}
h1{color:#f0ca75;font-size:clamp(25px,5vw,36px);margin:0 0 16px}
p{line-height:2;color:#cbd5e1}
a{display:inline-block;margin:18px 0;padding:13px 24px;border-radius:12px;background:#e8b44d;color:#152033;text-decoration:none;font-weight:700}
small{display:block;color:#9eacc2;line-height:1.8}
</style>
</head>
<body>
<main>
<h1>أُفُق انتقل إلى مساحة خاصة</h1>
<p>تم إيقاف النسخة العامة من أُفُق. أصبح الدخول إلى مساحة المؤسس الخاصة محمياً بتسجيل دخول منفصل.</p>
<a href="${privateUrl.origin}/" rel="noopener noreferrer">الدخول إلى أُفُق الخاص</a>
<small>إذا لم تكن مخولاً بالدخول، فلن تتمكن من فتح المساحة الخاصة. لا ترسل كلمات المرور أو رموز التحقق لأي شخص.</small>
<p id="cleanup" aria-live="polite">يجري تنظيف التخزين المحلي القديم لهذا الموقع على هذا الجهاز…</p>
</main>
<script>
(async () => {
  const status = document.getElementById("cleanup");
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appPath = new URL("./", location.href).pathname;
      await Promise.all(registrations.filter(registration => new URL(registration.scope).pathname.startsWith(appPath)).map(registration => registration.unregister()));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith("ofoq-shell-")).map(name => caches.delete(name)));
    }
    status.textContent = "اكتمل تنظيف نسخة أُفُق المخزنة على هذا المتصفح.";
  } catch (_) {
    status.textContent = "تعذر إكمال التنظيف تلقائياً. أعد تحميل هذه الصفحة أثناء الاتصال بالإنترنت.";
  }
})();
</script>
</body>
</html>
`;
writeFileSync(resolve(output, "index.html"), html, "utf8");
writeFileSync(resolve(output, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
writeFileSync(resolve(output, "_headers"), `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
`, "utf8");
console.log("Legacy GitHub Pages retirement artifact built. Visit it online on each owner device before unpublishing.");
