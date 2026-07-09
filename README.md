# Berto IDE

محرر أكواد ديسكتوب مبني بـ Electron + Monaco Editor (نفس محرك الكتابة اللي بيستخدمه VS Code)، بيدعم تثبيت إضافات VS Code الحقيقية (VSIX)، وفيه مساعد ذكاء اصطناعي مدمج، وتعديل جماعي حي (Live Collaboration)، وطرفية (Terminal) كاملة، وتكامل Git.

> A desktop code editor built on Electron + Monaco (VS Code's own editor engine), with real VSIX extension support, a built-in AI assistant, live collaborative editing, an integrated terminal, and Git integration.

---

## آخر تحديث: إصلاحات جوهرية وتصميم احترافي

بعد مراجعة لوجات بناء GitHub Actions الفعلية، تم إصلاح 3 مشاكل بناء حقيقية، وإعادة بناء الواجهة بالكامل:

| المشكلة | الحالة | التفاصيل |
|---|---|---|
| عدم دعم أجهزة Mac بمعالج Intel | تم الإصلاح | البناء كان بيطلع نسخة Apple Silicon (`arm64`) بس. دلوقتي بيبني نسختين منفصلتين: `mac-x64` (Intel) و`mac-arm64` (Apple Silicon) |
| فشل بناء Linux (`.deb`) | تم الإصلاح | السبب: `package.json` كان ناقصه بريد إلكتروني للمؤلف، وهو حقل مطلوب لبناء حزم Debian |
| توقف (timeout) عند رفع نسخة Windows على Releases | تم الإصلاح | السبب: 3 أنظمة تشغيل كانت بتحاول تنشر على نفس الـ Release في نفس الوقت وتتعارض مع بعض. دلوقتي البناء والنشر منفصلين تمامًا: كل نظام يبني بس، وjob واحد مركزي هو اللي ينشر بعد ما الكل يخلص |
| اسم الملف الناتج مفيهوش رقم إصدار واضح | تم الإصلاح | الصيغة الجديدة: `BertoIDE-Setup-1.0.0-win-x64.exe` (اسم واضح + رقم إصدار + منصة + معالج، بدون مسافات) |
| رقم الإصدار مش ظاهر داخل البرنامج نفسه | تم الإصلاح | ظاهر الآن في شاشة الترحيب وفي عنوان النافذة (Title Bar) |
| الأيقونة عادية | تم الإصلاح | أيقونة جديدة: خلفية سوداء صافية، ورمز `{=}` أبيض بخط عريض، بأسلوب بسيط واحترافي |
| إيموجي في الواجهة | تم الإصلاح | تمت إزالة كل الإيموجي من واجهة البرنامج، واستبدالها بمكتبة أيقونات SVG احترافية أحادية اللون (بنفس فلسفة Codicons) |
| أزرار "شكلها موجود بس مش شغالة" | تم الإصلاح | السبب الجذري: الكود القديم كان بيربط الأزرار بشكل غير منظم قد يفشل بصمت لو عنصر معين اتأخر تحميله. تمت إعادة بناء الواجهة بالكامل بحيث كل الأزرار تترابط داخل دالة تهيئة واحدة (`init()`) بعد التأكد من جاهزية DOM ومحرك Monaco. تم اختبار كل الأزرار الثلاثين في الواجهة برمجيًا والتأكد أنها تعمل جميعًا دون استثناء |
| تصميم عام يشبه VS Code | تم الإصلاح | هوية بصرية مستقلة: لون أساسي كهرماني (amber) بدل الأزرق الافتراضي، خط JetBrains Mono في كل عناصر الواجهة، أيقونة ورمز `{=}` مميز، تخطيط وتفاصيل تصميم خاصة بـ Berto IDE |

---

## المميزات الحقيقية (Real, working features)

| الميزة | الحالة | ملاحظات |
|---|---|---|
| محرر Monaco كامل (تلوين الصياغة، IntelliSense الأساسي) | يعمل بالكامل | نفس محرك VS Code |
| فتح/حفظ/تعديل ملفات ومجلدات | يعمل بالكامل | |
| طرفية مدمجة (Terminal) حقيقية | يعمل بالكامل | عبر `node-pty` |
| تكامل Git (init/add/commit/push/pull) | يعمل بالكامل | عبر `simple-git` |
| تثبيت إضافات VS Code من ملف `.vsix` | يعمل | يفك الضغط ويحمّل Themes/Snippets/Grammars/Languages تلقائيًا |
| تثبيت إضافات من متجر Open VSX مباشرة | يعمل | متجر مفتوح المصدر بديل لـ Marketplace |
| إضافات معقدة (بها Debugger أو API خاص بـ VS Code) | جزئي | يتم اكتشافها وعرض حالتها بصدق، لكن التفعيل الكامل لأي إضافة معقدة يحتاج محاكاة كاملة لـ VS Code Extension Host (خارج نطاق هذا الإصدار) |
| مساعد ذكاء اصطناعي مدمج (Chat, Explain, Fix) | يعمل | يستخدم مفتاح API الخاص بالمستخدم (Anthropic أو OpenAI) — لا يوجد مفتاح مضمّن بالكود |
| تعديل جماعي حي (Live Collaboration) | يعمل | عبر WebSocket محلي/شبكي بسيط (host/join) |
| لوحة أوامر (Command Palette) | يعمل | `Ctrl+Shift+P` |
| ثيمات وحجم خط وWord Wrap وMinimap | يعمل | |
| بناء تلقائي ونشر على GitHub Releases | يعمل | عبر GitHub Actions، لثلاث منصات وأربع معماريات (`win-x64`, `mac-x64`, `mac-arm64`, `linux-x64`) |

---

## كيف تشغّله محليًا (Development)

```bash
npm install
npm start
```

## كيف تبنيه لتوزيعه (Build for distribution)

```bash
npm run dist:win     # Windows installer + portable
npm run dist:mac     # macOS dmg + zip
npm run dist:linux   # Linux AppImage + deb + tar.gz
npm run dist:all     # الثلاثة مع بعض (يحتاج بيئة مناسبة لكل نظام)
```

الملفات الناتجة هتلاقيها في مجلد `release/`.

---

## النشر التلقائي على GitHub Releases (الجزء الأهم)

المشروع فيه GitHub Actions workflow جاهز في `.github/workflows/release.yml` بيعمل التالي تلقائيًا:

1. لما تعمل **tag** جديد بصيغة `vX.Y.Z` وترفعه (`git push --tags`)، الـ workflow بيشتغل على 3 أنظمة تشغيل مختلفة في نفس الوقت (Windows, macOS, Linux).
2. كل نظام بيبني نسخته الخاصة (installer/AppImage/dmg... إلخ).
3. بعد ما الثلاثة يخلصوا بناء، الـ job التاني (`release`) بيجمع كل الملفات الناتجة وينشرها تلقائيًا في **GitHub Releases** لنفس الـ tag، مع ملاحظات إصدار تلقائية (Release Notes).

### خطوات الاستخدام الفعلية:

```bash
# 1. تأكد إنك في مجلد المشروع وعامل git init ومربوط بريبو GitHub
git remote add origin https://github.com/USERNAME/berto-ide.git
git add .
git commit -m "Initial commit: Berto IDE v1.0.0"
git branch -M main
git push -u origin main

# 2. أنشئ tag واعمله push — هنا الأتمتة بتشتغل تلقائيًا
git tag v1.0.0
git push origin v1.0.0
```

بعد كام دقيقة هتلاقي تبويب **Actions** في الريبو شغال، وبعد ما يخلص هتلاقي **Release** جديد تحت تبويب **Releases** فيه:
- `BertoIDE-Setup-1.0.0-win-x64.exe` (installer) + نسخة portable
- `BertoIDE-Setup-1.0.0-mac-x64.dmg` (لأجهزة Intel) + `BertoIDE-Setup-1.0.0-mac-arm64.dmg` (لأجهزة Apple Silicon: M1/M2/M3/M4) + نسخ `.zip` مقابلة
- `BertoIDE-Setup-1.0.0-linux-x64.AppImage` + `.deb` + `.tar.gz`

> ملحوظة: مفيش أي إعداد إضافي مطلوب — الـ workflow بيستخدم `GITHUB_TOKEN` المدمج تلقائيًا في كل ريبو، من غير ما تحتاج تضيف أي secret بنفسك (إلا لو عايز توقيع رقمي/code signing لاحقًا).

### تشغيل الـ Actions يدويًا بدون tag (للتجربة)

من تبويب **Actions** في الريبو، اختار workflow اسمه **"Build and Release Berto IDE"**، دوس **Run workflow**، واختار `publish: true` لو عايز ينشر Release فعلي، أو سيبه `false` لو عايز بس تتأكد إن البناء بيشتغل صح وتحمّل الملفات كـ Artifacts من نفس صفحة الـ run.

---

## كيف يعمل دعم إضافات VS Code (VSIX)

ملف `.vsix` هو في الحقيقة أرشيف ZIP عادي. Berto IDE بيعمل:
1. فك الضغط الفعلي للملف داخل مجلد بيانات المستخدم.
2. قراءة `package.json` بتاع الإضافة (الـ manifest).
3. تحليل قسم `contributes` وتحميل تلقائي لأي:
   - **Themes** (ثيمات الألوان)
   - **Snippets** (قوالب الكود الجاهزة)
   - **Grammars/Languages** (تلوين صياغة لغات جديدة)
4. أي إضافة فيها كود Node.js حقيقي (activation function) أو Debugger، بيتم اكتشافها وعرضها بوضوح كـ "partial support" — الواجهة مش بتدّعي إنها شغالة 100% لو مش شغالة فعلاً، عشان الصدق مع المستخدم أهم من الادعاء.

---

## إعداد مساعد الذكاء الاصطناعي

من تبويب **AI Assistant** في الشريط الجانبي:
1. اختار المزوّد (Anthropic أو OpenAI).
2. حط مفتاح API الخاص بيك (بيتشفّر ويتخزن محليًا على جهازك فقط عبر `safeStorage`، ومفيش أي مفتاح مضمّن في الكود أو بيتبعت لأي سيرفر تابع لـ Berto IDE).
3. ابدأ الدردشة، أو استخدم "Explain Selection" / "Fix Error" على أي كود محدد في المحرر.

---

## إعداد التعديل الجماعي الحي (Live Collaboration)

- الشخص المضيف (Host) بيدوس "Start Live Session" — ده بيفتح سيرفر WebSocket محلي على بورت `5577`.
- أي حد تاني على نفس الشبكة (أو عبر VPN/port-forwarding) بيدوس "Join Session" وبيحط عنوان المضيف زي: `ws://192.168.1.10:5577`.
- التعديلات والمؤشرات بتتزامن بين الطرفين لحظيًا.

> ملحوظة أمان: ده اتصال مباشر بدون تشفير TLS في هذا الإصدار — مناسب للشبكات المحلية الموثوقة، ولو هتستخدمه عبر الإنترنت العام يُفضّل تمريره عبر نفق آمن (SSH tunnel / VPN / Tailscale).

---

## هيكل المشروع

```
berto-ide/
├── .github/workflows/     # أتمتة البناء والنشر (GitHub Actions)
├── build/                  # أيقونات التطبيق (ico/icns/png)
├── resources/               # موارد إضافية تُنسخ مع التطبيق
├── src/
│   ├── main/                # عملية Electron الرئيسية (Node.js backend)
│   │   ├── main.js
│   │   ├── preload.js        # جسر آمن بين الواجهة والـ backend
│   │   ├── menu.js
│   │   └── ipc/               # كل المعالجات: ملفات، طرفية، إضافات، git، AI، تعاون
│   └── renderer/             # واجهة المستخدم (HTML/CSS/JS)
│       ├── index.html
│       ├── app.js
│       ├── modules/           # Editor manager, File tree, Command palette, Terminal
│       └── styles/main.css
└── package.json
```

---

## أفكار للتطوير المستقبلي (Roadmap)

- محاكاة كاملة لـ VS Code Extension Host (Node.js sandbox) لتشغيل إضافات معقدة 100%
- Debug Adapter Protocol (DAP) لدعم الـ Debugging الكامل
- Operational Transform / CRDT حقيقي للتعديل الجماعي (بدل التزامن المباشر البسيط الحالي)
- توقيع رقمي (code signing) لنسخ Windows/macOS لتفادي تحذيرات "ناشر غير معروف"

---

## الرخصة

MIT — استخدمه، عدّله، ووزّعه بحرية.
