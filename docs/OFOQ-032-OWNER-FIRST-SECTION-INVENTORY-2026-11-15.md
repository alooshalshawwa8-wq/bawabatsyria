# OFOQ-032 — Owner-first section and route inventory

**Date:** 2026-11-15  
**Branch:** `aloosh/brand-prep-2026-11-15`  
**Source:** `index.html` at the branch head inspected read-only.  
**Status:** Inventory document only; no application code, live data, routes, or production settings changed.

## Executive findings

- The source catalogue currently contains **78 parseable section records** in the `const sections = [...]` array in `index.html`.
- This does **not** match the earlier working assumption of 78 sections. The local-favorites core caps stored favorites at 78, but that cap is not evidence that 78 catalogue entries exist. Do not report 78 active sections until a fresh count from the complete source confirms it.
- The inventory preserves all 78 parsed IDs and titles. Classification is a first-pass recommendation based on title and description, not a claim that every listed feature is fully implemented or operational.
- The current home catalogue is grouped into broad visitor-facing categories in the page renderer. The proposed owner workspaces below are a separate organizational layer; they should not rewrite section IDs or delete sections.
- Several sections are generic public-service concepts, public marketplace concepts, or entertainment/reference tools. Their presence in the source does not authorize public launch or imply that their external data/integrations work.

## Owner-first workspace proposal

1. **Command center / daily operations:** accounting and inventory, trader/building-materials, trading research, agriculture and fertilizers, marketing, personal social accounts, e-commerce planning, prices, personal finance, AI workbench, creative/design/video, and a curated news/event briefing.
2. **Business and projects:** business planning, startup research, freelance skills, career tracking, directory research, expatriate investment research, and real-estate/building references.
3. **Knowledge library:** education, curricula, engineering, coding, languages, science/space, encyclopedia, history, books, culture, heritage, and practical reference guides.
4. **Personal life and interests:** travel, food, family, fitness, pets, football, games, classic media, astrology/entertainment, and design inspiration.
5. **Security and settings:** digital security, wallet safety, privacy, accessibility, terms/disclaimers, and account-protection references.

## Complete parsed catalogue

| Stable section ID | Current title | First-pass classification | Source description |
|---|---|---|---|
| `prices` | مؤشر الأسواق والأسعار | مساحة عمل يومية مرشحة | دليل متابعة أسعار الصرف والذهب والسلع، مع حاسبة تحويل يدوية تتيح إدخال السعر والتحقق من النتائج |
| `chef` | مطبخ أُفُق العالمي | مكتبة مرجعية / ترفيهية | عجلة الحظ التفاعلية للطبخات، خطط فطورك وغداك، ونظام فضّي الثلاجة الذكي |
| `mirror` | استوديو الجمال والإطلالة الذكية | مكتبة مرجعية / ترفيهية | المرآة السحرية الذكية، تجربة قصات، ألوان صبغات وعدسات حية ومحلل أبعاد الوجه |
| `travel_visa` | بوابة السفر والتأشيرات | مساحة عمل عند الحاجة | متطلبات التأشيرات حسب نوع جواز السفر، التأشيرات الإلكترونية وتصديق الشهادات للمغتربين والطلاب |
| `domestic_economy` | إدارة المنزل والاقتصاد الذكي | مساحة عمل عند الحاجة | حيل التوفير الذكية للعائلات، صناعة البدائل المنزلية، وحفظ الأغذية والمؤونة بدون طاقة كهربائية مستمرة |
| `code_sandbox` | مختبر البرمجة والتطوير | مساحة عمل عند الحاجة | فحص وتصحيح الأكواد البرمجية الفوري وتوليد الشيفرات البرمجية الذكية مجاناً لطلاب المعلوماتية والتقنية |
| `directory_services` | دليل الخدمات والشركات | مساحة عمل عند الحاجة | دليل تجاري وخدمي أصفر ذكي للبحث عن المحلات، الفعاليات، الورشات، والمكاتب في كافة المحافظات |
| `cash_shield` | حماية المحافظ والمدفوعات الرقمية | مساحة عمل عند الحاجة | كشف الروابط المشبوهة والاحتيالية فوراً، ودليل تحصين المحافظ الإلكترونية المالية من السرقة والاختراق |
| `no_khosoosie` | المعلم الذكي والمراجعة الدراسية | مكتبة مرجعية / ترفيهية | المدرس الافتراضي الفوري لتفكيك وشرح قواعد ومسائل المناهج وملخصات الدقائق الأخيرة |
| `engineer_vip` | المستشار الهندسي ومشاريع التخرج | مساحة عمل عند الحاجة | مقترح ومولد أفكار مشاريع التخرج الهندسية المتكاملة، ومساعد حل الأكواد والمخططات |
| `marketing_vip` | استوديو التسويق وصناعة الحملات | مساحة عمل يومية مرشحة | صياغة منشورات إعلانية بيعية، هندسة خطط المحتوى الشهري، وأفكار ريلز لزيادة المبيعات |
| `video_factory_vip` | مصنع الفيديو والسيناريوهات الإبداعية | مساحة عمل يومية مرشحة | خطافات أول 3 ثوانٍ الفيروسية، كاتب سيناريو التيك توك والريلز، وعناوين يوتيوب جذابة |
| `trader_market` | سوق التاجر ومواد البناء | مساحة عمل يومية مرشحة | أسعار الحديد والأسمنت ومواد الإكساء التموينية جملة، وحاسبة المقاولات التقديرية العظم والكامل |
| `trading_academy` | أكاديمية التداول والأسواق المالية | مساحة عمل يومية مرشحة | دليل تداول الذهب، الفضة، والعملات الرقمية، تفسير مؤشرات RSI والماكد ومحاكي محفظة وهمية |
| `freelance_vip` | منصة العمل الحر والمهارات الرقمية | مساحة عمل عند الحاجة | أسرار العمل على مستقل وUpwork، مهارات الذكاء الاصطناعي المربحة ومولّد بورتفوليو احترافي |
| `body_language` | علم السلوك ولغة الجسد | مراجعة يدوية | فك شفرات حركات العيون والجسد، رادار كشف الكذب الجنائي واختبار الأنماط MBTI |
| `apps_games` | مكتبة التطبيقات والألعاب | مكتبة مرجعية / ترفيهية | تحميل مباشر لأحدث البرامج والألعاب، فاحص الفيروسات المدمج ومستشار مواصفات تشغيل الألعاب |
| `nostalgia_archive` | أرشيف الذاكرة والفنون الكلاسيكية | مكتبة مرجعية / ترفيهية | توثيق روائع الدراما والأغاني التراثية والقدود، مع مسابقات واختبارات تفاعلية مسلية للزمن الجميل |
| `accounting_vip` | النظام المحاسبي وإدارة المخزون | مساحة عمل يومية مرشحة | حاسبة التسعير اللحظي للبضائع والأرباح، الدفتر التجاري الإلكتروني الآمن محلياً وتنبيهات مستودعاتك |
| `civil` | دليل الأحوال المدنية والمعاملات | مساحة عمل عند الحاجة | الأوراق الرسمية لـ الجوازات، الهويات، إخراج القيد، لا حكم عليه وحاسبة الرسوم الطوابعية |
| `realestate` | العقارات والتراخيص والبناء | مساحة عمل عند الحاجة | معاملات الطابو، الفراغ والبيوع، تراخيص البناء والترميم، والمقيّم العقاري التقريبي الذكي |
| `consular` | الخدمات القنصلية وشؤون المغتربين | مساحة عمل عند الحاجة | خدمات السفارات، تنظيم الوكالات العامة والخاصة عن بعد وتصديق الوثائق وإجراءات زيارة البلاد |
| `legal` | الدليل القانوني والخدمات القضائية | مساحة عمل عند الحاجة | صياغة العقود الفورية، تفسير المواد الدستورية، دليل المحامين ونظام فض النزاعات ودياً |
| `business` | بوابة الأعمال وتأسيس الشركات | مساحة عمل عند الحاجة | خطوات تأسيس الشركات بالسجل التجاري، مولّد أفكار المشاريع وحاسبة الضرائب التجارية السنوية |
| `jobs` | منصة الوظائف والمسار المهني | مساحة عمل عند الحاجة | وظائف القطاعات، صانع السيرة الذاتية CV الاحترافي ومحاكي مقابلات العمل مع الـ HR |
| `energy` | دليل الطاقة والكهرباء | مساحة عمل عند الحاجة | مواعيد التقنين وتتبع الوقود، حاسبة تصاميم منظومات الطاقة الشمسية المنزلية والأنفرتر |
| `water` | خدمات المياه والإدارة البلدية | مساحة عمل عند الحاجة | حاسبة ترشيد خزانات المياه والمجالس المحلية ودليل تدوير الاستهلاك المنزلي بذكاء |
| `telecom` | دليل الاتصالات والإنترنت | مساحة عمل عند الحاجة | باقات الشابكة، حاسبة استهلاك الميغابايت ومحلل جودة الإشارة وتسريع الرواتر |
| `health` | بوابة الصحة والخدمات الطبية | مساحة عمل عند الحاجة | المشخص الأولي للأعراض والموجه الطبي للتخصصات والصيدليات المناوبة والمشافي |
| `education` | منصة التعليم والمدارس والجامعات | مساحة عمل عند الحاجة | الموجه الدراسي ومخطط الامتحانات ومستشار فرز المفاضلات الجامعية لطلاب البكالوريا |
| `syria_curriculum` | المناهج السورية والاختبارات | مكتبة مرجعية / ترفيهية | بنك ملخصات ونماذج امتحانية وحلول كتب الابتدائي والإعدادي والثانوي وشرح القواعد الصعبة |
| `solidarity` | منصة التكافل والمبادرات المجتمعية | مكتبة مرجعية / ترفيهية | منصة التكافل الخيري، صلة وصل الجمعيات الأهلية والفرص التطوعية الشبابية التنموية |
| `transport` | دليل النقل والتنقل بين المدن | مساحة عمل عند الحاجة | مخطط رحلات الحافلات والقطارات بين المدن والمحافظات وحاسبة التكلفة المبدئية للسفر |
| `cars_guide` | موسوعة السيارات والقيادة | مساحة عمل عند الحاجة | مساعد تشخيص أعطال ميكانيك السيارات والدراجات ومحاكي الفحص النظري لشهادات السوق |
| `tourism` | اكتشف الوجهات والسياحة المحلية | مكتبة مرجعية / ترفيهية | المرشد السياحي لآثار ومصايف البلاد، وصانع برامج العطلات والجولات المتكاملة |
| `culture` | المشهد الثقافي والفنون والفعاليات | مكتبة مرجعية / ترفيهية | أجندة المعارض والمسارح والأمسيات، والصالون الأدبي النقدي لإبداعات الكتاب الهواة |
| `agriculture` | الزراعة والإنتاج الحيواني | مساحة عمل يومية مرشحة | المهندس الزراعي لخدمة المحاصيل والوقاية من الآفات وطرق التربية المنزلية والإنتاجية |
| `fertilizers` | دليل الأسمدة والتغذية الزراعية | مساحة عمل يومية مرشحة | حاسبة كميات التسميد الكيماوي والعضوي للدونم وصناعة الكومبوست الطبيعي من بقايا المنزل |
| `birds_pets` | عالم الطيور والحيوانات الأليفة | مكتبة مرجعية / ترفيهية | العناية بالطيور والكناري والداجن، جداول التغذية وتشخيص الأمراض البيطرية الشائعة وعزلها |
| `sports_radar` | أُفُق FOOTBALL / مركز كرة القدم العالمي | مكتبة مرجعية / ترفيهية | مركز كروي تفاعلي للمباريات والبطولات والأندية والمنتخبات السورية والعربية والعالمية، مع التحليل والتكتيك وكشاف المواهب وتوقعات المشجعين وأكاديمية كرة القدم |
| `zodiac_world` | عالم الأبراج والترفيه والاختبارات | مكتبة مرجعية / ترفيهية | الأبراج اليومية والتوافق العاطفي وقراءة الفنجان وتاروت تفاعلي واختبارات الشخصية ورسائل الكون |
| `news` | مرصد الأخبار والمستجدات المحلية | مساحة عمل يومية مرشحة | تغطية فخمة وموجزة لآخر الأحداث المحلية وتلخيصها عبر الذكاء الاصطناعي بحيادية تامة |
| `expatriates_invest` | بوابة استثمارات المغتربين | مساحة عمل عند الحاجة | أفكار مشاريع استثمارية وإنتاجية مدروسة ومربحة لتنمية المجتمع برؤوس أموال اغترابية |
| `heritage` | موسوعة التراث والفنون الشعبية | مكتبة مرجعية / ترفيهية | موسوعة الفلكلور والأهازيج والأزياء والعادات الشعبية من مختلف المناطق |
| `security` | مركز الأمن والحماية الرقمية | مساحة عمل عند الحاجة | فحص فوري للروابط والملفات من الاختراق وكشف صفحات الاحتيال الإلكتروني لحمايتك رقمياً |
| `reports` | بوابة البلاغات والشكاوى | مساحة عمل عند الحاجة | إعادة صياغة الشكاوى الموجهة للمديريات والمجالس المحلية بأسلوب رسمي وقانوني محكم |
| `syria_ai` | المساعد الذكي لمنصة أُفُق | مساحة عمل يومية مرشحة | مساعد محادثة ذكي للمعلومات والخدمات والمعرفة، بإجابات واضحة وإرشاد عملي لمختلف البلدان |
| `social_media_hub` | دليل منصات التواصل وصناعة الحضور الرقمي | مساحة عمل يومية مرشحة | دليل تفاعلي لأشهر منصات التواصل مثل Facebook وInstagram وTikTok وYouTube وWhatsApp وTelegram وX، مع مقارنة المزايا وأدوات صناعة المحتوى وإدارة الحضور الرقمي |
| `ecommerce_studio` | استوديو التجارة الإلكترونية والمتاجر | مساحة عمل يومية مرشحة | تجهيز صفحات المنتجات، حاسبة التسعير والربحية، تنظيم الطلبات وخطة إطلاق المتجر خطوة بخطوة |
| `design_lab` | مختبر التصميم والهوية البصرية | مساحة عمل يومية مرشحة | تخطيط الهوية البصرية، أفكار المنشورات، تقويم المحتوى، موجزات التصميم وحزم الحملات الإبداعية |
| `language_academy` | أكاديمية اللغات والترجمة | مساحة عمل عند الحاجة | خطط تعلم اللغات، بطاقات المفردات، تدريبات المحادثة، تمارين القواعد ومتابعة التقدم اليومي |
| `fitness_coach` | مدرب اللياقة وبناء العادات | مساحة عمل عند الحاجة | مخطط نشاط أسبوعي، متتبع العادات، حاسبة أهداف عامة وسجل التقدم مع إرشادات آمنة غير تشخيصية |
| `events_calendar` | منظم الفعاليات والمناسبات | مساحة عمل يومية مرشحة | تخطيط المناسبات، قوائم المهام والضيوف والميزانية، وجدول التحضير وتوزيع المسؤوليات |
| `syria_marketplace` | سوق أُفُق للإعلانات والخدمات | مراجعة يدوية | إنشاء إعلانات بيع وشراء وخدمات، قوالب وصف احترافية، قوائم تحقق للسلامة وتجهيز الإعلان للنشر في مختلف الأسواق |
| `auto_moto_gallery` | معرض السيارات والدراجات الحديثة | مساحة عمل عند الحاجة | معرض للموديلات الحديثة، مقارنة المواصفات والمحركات والمدى والتقنيات، مع صور وتصنيفات للسيارات والدراجات النارية |
| `tech_devices` | دليل الهواتف والحواسيب والتقنيات | مساحة عمل عند الحاجة | موسوعة الهواتف واللابتوبات، مقارنة المعالجات والشاشات والكاميرات والبطاريات والذاكرة، مع صور ومواصفات الأجهزة |
| `luxury_villas` | العمارة الفاخرة والفلل والقصور | مكتبة مرجعية / ترفيهية | أفكار وتصاميم معمارية للفيلات والقصور، واجهات وديكورات ومخططات ومساحات وحاسبة تقديرية لتكاليف البناء |
| `science_space` | موسوعة العلوم والفلك والفضاء | مساحة عمل عند الحاجة | رحلة معرفية في الفيزياء والكيمياء والأحياء والفلك والفضاء، مع شروحات مبسطة ومفاهيم وتجارب آمنة |
| `world_encyclopedia` | الموسوعة العالمية للمعرفة | مساحة عمل عند الحاجة | مداخل منظمة في الجغرافيا والتاريخ والعلوم والمجتمعات والاختراعات والمعارف العامة من منظور عالمي |
| `ai_lab` | مختبر الذكاء الاصطناعي والنماذج الذكية | مساحة عمل يومية مرشحة | دليل أدوات الذكاء الاصطناعي، هندسة الأوامر، الاستخدام المسؤول، وأفكار تطبيقية للتعلم والعمل والإبداع |
| `environment_climate` | البيئة والمناخ والطاقة المستدامة | مساحة عمل عند الحاجة | المناخ والتنوع الحيوي والطاقة النظيفة وإعادة التدوير وحلول الاستدامة في المنزل والعمل والمجتمع |
| `personal_finance` | إدارة المال والتخطيط المالي | مساحة عمل يومية مرشحة | إدارة الميزانية والادخار والديون والتخطيط للأهداف وفهم المخاطر المالية دون توصيات استثمارية شخصية |
| `world_history` | موسوعة التاريخ والحضارات | مساحة عمل عند الحاجة | خط زمني للحضارات والأحداث والشخصيات والتحولات الكبرى مع التمييز بين الوقائع والتفسيرات التاريخية |
| `global_languages` | لغات العالم ومهارات التواصل | مساحة عمل عند الحاجة | مداخل لتعلم اللغات والمحادثة والترجمة وآداب التواصل بين الثقافات ومهارات الكتابة |
| `global_cuisine` | مذاقات العالم وفنون الطهي | مكتبة مرجعية / ترفيهية | أطباق ومكونات وتقنيات طهي من ثقافات العالم، بدائل المكونات وإرشادات سلامة الغذاء |
| `family_life` | الحياة الأسرية والمهارات اليومية | مساحة عمل عند الحاجة | تنظيم المنزل والتواصل الأسري وإدارة الوقت والميزانية والمهارات اليومية العملية |
| `books_knowledge` | مكتبة الكتب والأدب والمعرفة | مساحة عمل عند الحاجة | عوالم الأدب والقراءة النقدية ومناهج التلخيص والكتابة والتعلم الذاتي |
| `creative_studio` | استوديو الإبداع وتطوير الأفكار | مساحة عمل يومية مرشحة | تطوير الأفكار وبناء النماذج الأولية والتصميم والتفكير الإبداعي وتحويل المشروعات إلى خطط قابلة للتنفيذ |
| `photography_media` | التصوير والإنتاج المرئي | مساحة عمل عند الحاجة | أساسيات التصوير والإضاءة والصوت والمونتاج والسرد البصري وإنتاج المحتوى بمسؤولية |
| `gaming_arena` | عالم الألعاب والرياضات الإلكترونية | مكتبة مرجعية / ترفيهية | موسوعة أنواع الألعاب والمنصات والمواصفات واللعب الآمن والرياضات الإلكترونية |
| `fitness_wellness` | الصحة واللياقة ونمط الحياة | مساحة عمل عند الحاجة | مبادئ الحركة والنوم والعادات الصحية والتوازن اليومي مع إرشادات عامة غير تشخيصية |
| `digital_citizenship` | الثقافة الرقمية والخصوصية | مساحة عمل عند الحاجة | الخصوصية والأمان الرقمي والتحقق من المعلومات والحقوق والمسؤوليات والسلوك الآمن على الإنترنت |
| `global_travel` | دليل السفر والوجهات العالمية | مكتبة مرجعية / ترفيهية | التخطيط للرحلات والثقافات والوجهات وآداب السفر وقوائم التجهيز ومعلومات يجب التحقق من تحديثها |
| `startup_lab` | مختبر ريادة الأعمال والشركات الناشئة | مساحة عمل عند الحاجة | دراسة الفكرة والسوق ونموذج العمل والميزانية والتسويق وخطة إطلاق مشروع صغير أو ناشئ |
| `sustainable_living` | الحياة المستدامة والاستهلاك الواعي | مساحة عمل عند الحاجة | تقليل الهدر وإعادة الاستخدام والإصلاح والاستهلاك الواعي وحلول عملية لتوفير الموارد |
| `privacy_center` | مركز الخصوصية وحماية البيانات | مساحة عمل عند الحاجة | مبادئ الخصوصية والبيانات والأمان الرقمي وإرشادات حماية الحسابات والمعلومات الشخصية |
| `terms_of_use` | سياسة الاستخدام وإخلاء المسؤولية | مكتبة مرجعية / ترفيهية | قواعد الاستخدام المسؤول وحدود المعلومات وإرشادات الحقوق والامتثال للقوانين المعمول بها |
| `accessibility_center` | مركز الوصول الرقمي وتجربة الجميع | مكتبة مرجعية / ترفيهية | إرشادات استخدام المنصة على الهاتف ولوحة المفاتيح وتقنيات المساعدة وتجربة رقمية أكثر شمولاً |

## Route and behavior notes

- Section identity is represented by stable `id` values in `window.BAWABA_SECTIONS`; these IDs are consumed by `openSection`, search/render logic, local favorites/recent history, section links, and other scripts.
- `ofoq-core.js` persists favorite and recent **IDs** in local storage under `ofoq_personal_space_v1`; it validates IDs against the catalogue and keeps at most 78 favorites and 12 recent items. Preserve the storage key and IDs during rebranding/reorganization.
- `ofoq-workspaces.js` decorates existing section flows and includes data-backed CRM/career panels. Its presence alone does not establish that every panel is enabled, owner-only, or suitable for the personal operating model; inspect auth/RLS and actual route invocation before reuse.
- The source page contains many `data-open-section` links and section-specific rendering branches. This inventory deliberately does not infer that every section has a unique route or that every one is complete.
- Before changing navigation, produce a second pass mapping each section ID to: render handler, data/API calls, auth requirements, writes/deletes, external links, and test coverage.

## Prioritization and disposition

### Prioritize for the first owner command center
- `accounting_vip`, `trader_market`, `trading_academy`, `agriculture`, `fertilizers`
- `marketing_vip`, `social_media_hub`, `ecommerce_studio`, `prices`, `personal_finance`
- `syria_ai`, `ai_lab`, `creative_studio`, `design_lab`, `video_factory_vip`

### Keep accessible, but move out of the daily command center
All remaining catalogue entries should remain available in appropriate workspaces or the reference library while their actual implementation, data freshness, legal/safety boundaries, and usefulness are reviewed.

### No automatic retirement
No section is marked for deletion. Do not remove section records, data, storage, route IDs, API contracts, or user content based on this inventory. Any later retirement proposal must include usage evidence, dependencies, data-retention implications, and a reversible migration plan.

## Verification tasks for the next engineering pass

1. Recount the full source catalogue with a parser-aware test and fail CI if the expected count drifts unexpectedly.
2. Enumerate all section IDs and assert uniqueness.
3. Build an ID-to-handler map from `openSection` and `activateSectionPage` plus any section-specific dispatch tables.
4. Trace each section's Supabase tables, Edge Functions, external APIs, and local storage.
5. Identify writes, deletes, publishing, messaging, payments, trading, and account/security actions that require explicit owner confirmation.
6. Separate implemented functionality from static copy, mock/demo behavior, and unconfigured integrations.
7. Only after the private-access gate is complete, implement the owner-first navigation and canonical visible brand.

## Safety boundary

This commit adds documentation only. It does not merge PR #32, deploy, change repository visibility, disable GitHub Pages, configure Cloudflare, change Supabase production settings, call external APIs, spend money, or alter any user's data.
