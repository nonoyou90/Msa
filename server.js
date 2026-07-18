// server.js
// 1. استدعاء المكتبات البرمجية الأساسية لإدارة الشبكة والاتصالات
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenAI } = require('@google/generative-ai'); 

const app = express();

// تفعيل برمجية CORS لضمان استقبال الطلبات من موقعك في بلوجر بأمان وبشكل مجاني
app.use(cors());
app.use(express.json()); // السماح للسيرفر بقراءة البيانات القادمة بصيغة JSON

// 2. جلب المفاتيح السرية المجانية المخزنة بأمان في بيئة Vercel
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// تهيئة محرك الذكاء الاصطناعي باستخدام مفتاحك المجاني
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// المسار البرمجي المجاني والسريع لتوليد مقالات السيو الاحترافية
app.post('/api/generate-article', async (req, res) => {
    const { query, isTv } = req.body;
    
    // التحقق البرمجي لمنع إرسال طلبات فارغة تستهلك الحصة المجانية دون فائدة
    if (!query) {
        return res.status(400).json({ error: "تنبيه: حقل البحث فارغ، يرجى إدخال اسم العمل." });
    }

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        // أ. الاستعلام من قاعدة بيانات TMDB المجانية لجلب معرف العمل الفني (ID) إذا تم إدخال اسم نصي
        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}?&query=${encodeURIComponent(query)}&language=ar`);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                movieId = searchRes.data.results[0].id;
            } else {
                return res.status(404).json({ error: "لم يتم العثور على هذا العمل في قاعدة بيانات TMDB." });
            }
        }

        // ب. جلب البيانات الفنية والتفصيلية وطاقم العمل بالكامل
        const detailsRes = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits&language=ar`);
        const data = detailsRes.data;

        const title = data.title || data.name;
        const releaseYear = (data.release_date || data.first_air_date || "2026").split('-')[0];
        const overview = data.overview || "";
        const rating = data.vote_average ? data.vote_average.toFixed(1) : "7.5";
        
        // استخراج اسم المخرج أو المنتج التنفيذي برمجياً
        let director = "صناع السينما المحترفين";
        if (data.credits && data.credits.crew) {
            const dir = data.credits.crew.find(c => c.job === "Director" || c.job === "Executive Producer");
            if (dir) director = dir.name;
        }
        // جلب أول 5 ممثلين من طاقم العمل
        let actors = data.credits?.cast?.slice(0, 5).map(a => a.name).join(' ، ') || "";

        // ج. استدعاء النموذج المجاني والسريع للغاية (gemini-1.5-flash)
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            generationConfig: {
                temperature: 0.8, // رفع معيار الإبداع برمجياً لمنع النصوص الآلية والحصول على صياغة بشرية مشوقة
                topP: 0.95
            }
        });

        // صياغة أمر برمي (Prompt) احترافي ومكثف لجعل النموذج المجاني يكتب كأنه ناقد خبير
        const prompt = `
        أنت ناقد سينمائي محترف ومبدع تعمل ككاتب سيو رئيسي في منصة MovoraStar المتقدمة.
        اكتب مقالاً نقدياً مطولاً، غنياً بالمعلومات والتفاصيل السينمائية باللغة العربية عن ${isTv ? 'مسلسل' : 'فيلم'} "${title}" الصادر عام ${releaseYear}.
        
        المعطيات الفنية المرجعية:
        - قصة العمل الأساسية: ${overview}
        - المخرج: ${director}
        - أبرز النجوم المشاركين: ${actors}
        
        شروط الصياغة البرمجية: أنتج المحتوى مباشرة مقسماً بوسوم HTML قياسية (h2, p, blockquote, ul, li) وبأسلوب أدبي سينمائي ممتع، دون كتابة وسوم html أو body الخارجية:
        1. مقدمة سينمائية ساحرة ومبتكرة تخطف عين القارئ وتتحدث عن أجواء العمل الفنية.
        2. تحليل سردي عميق للقصة وتفكيك العقدة الدرامية وشرح تفصيلي وموسع للنهاية وما ترمز إليه.
        3. مراجعة نقدية متوازنة توضح عناصر القوة البصرية والإخراجية ونقاط الضعف السينمائية.
        4. الأبعاد الفلسفية أو الرسائل الفكرية والمجتمعية الكامنة وراء السيناريو.
        5. قسم كلمات مفتاحية مستهدفة مدمجة طبيعياً داخل السياق مثل: (مشاهدة فيلم ${title} مترجم، قصة مسلسل ${title}، مراجعة ونهاية ${title}).
        
        احرص على أن تكون الجمل انسيابية، خالية من الركاكة الآلية، ومثالية تماماً للتصدر في محركات البحث.
        `;

        // إرسال الأمر للنموذج المجاني واستلام النص
        const aiResponse = await model.generateContent(prompt);
        const generatedText = aiResponse.response.text();

        // د. بناء البيانات المنظمة (JSON-LD Schema) لربط السيو بجوجل بشكل احترافي مجاني
        const jsonLdSchemas = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://movorastar.com/#article-${movieId}",
      "headline": "مراجعة وتحليل ${isTv ? 'مسلسل' : 'فيلم'} ${title} (${releaseYear}) بالكامل",
      "description": "قراءة نقدية حصرية في قصة ونهاية ${title}. تعرف على أبطال العمل والتقييم الفني الشامل عبر MovoraStar.",
      "datePublished": "2026-07-19T00:00:00+00:00",
      "author": { "@type": "Organization", "name": "MovoraStar" }
    },
    {
      "@type": "Movie",
      "name": "${title}",
      "image": "https://image.tmdb.org/t/p/w500${data.poster_path}",
      "dateCreated": "${releaseYear}",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "${rating}",
        "bestRating": "10",
        "ratingCount": "${data.vote_count || 100}"
      }
    }
  ]
}
</script>
        `;

        // دمج السكيما مع النص المولد وتغليفه بكلاس التصميم الخاص بـ MovoraStar
        const finalHTML = `${jsonLdSchemas}\n<div class="movorastar-post-body">\n${generatedText}\n</div>`;

        // إرجاع النتيجة النهائية الاحترافية لواجهة بلوجر الخاصة بك
        res.json({
            title: title,
            searchDescription: `تحليل ومراجعة ${isTv ? 'مسلسل' : 'فيلم'} ${title} (${releaseYear}). قصة العمل، قراءة فنية للنهاية والأبطال عبر MovoraStar.`,
            html: finalHTML
        });

    } catch (err) {
        // تسجيل الخطأ برمجياً في لوحة تحكم Vercel ومناولته لمنع توقف السيرفر المجاني
        console.error("خطأ فني في السيرفر المجاني:", err.message);
        res.status(500).json({ error: "تنبيه: واجه المحرك المجاني ضغطاً في الطلبات، يرجى المحاولة مرة أخرى بعد ثوانٍ." });
    }
});

// إعداد منفذ الخادم الافتراضي لبيئة Vercel المجانية
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Free Server Running Successfully`));
