import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve("dist-hold");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>أُفُق | مساحة خاصة قيد الإعداد</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#091426;color:#f4f6fa;font-family:Tahoma,"Segoe UI",sans-serif}
main{max-width:560px;padding:32px;border:1px solid #806b42;border-radius:20px;background:#112039;text-align:center}
h1{color:#edc16a}p{line-height:2;color:#cbd5e1}
</style>
</head>
<body>
<main>
<h1>أُفُق</h1>
<p>المساحة الخاصة قيد الإعداد والحماية.</p>
<p>لم يتم نشر واجهة التطبيق أو أي بيانات مستخدم على هذا العنوان بعد.</p>
</main>
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
  Content-Security-Policy: frame-ancestors 'none'
`, "utf8");
console.log("Non-sensitive Cloudflare holding artifact built. Use it to configure Access before publishing the app.");
