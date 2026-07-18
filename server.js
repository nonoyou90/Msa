// server.js
// استدعاء المكتبات البرمجية اللازمة للشبكات والاتصال
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// تفعيل برمجية CORS لمنع المتصفحات من حظر الطلبات القادمة من بلوجر
app.use(cors());
// تفعيل قراءة البيانات الواردة بتنسيق JSON
app.use(express.json());

// مفتاح API السري لـ TMDB (سيتم قراءته من إعدادات Vercel الآمنة)
const TMDB_API_KEY = process.env.TMDB_API_KEY; 

/**
 * دالة برمجية لتحليل تصنيف العمل ودولته لتوليد كلمات مفتاحية ذكية ومستهدفة
 */
function analyzeWorkType(genres, originCountries) {
    let type = "فيلم سينمائي";
    let keywords = ["مشاهدة فيلم", "تحميل فيلم", "قصة فيلم", "مراجعة فيلم", "نهاية فيلم"];
    
    const genreNames = genres.map(g => g.name).join(' ');
    const isAnimation = genreNames.includes("رسوم متحركة") || genreNames.toLowerCase().includes("animation");
    const isKorean = originCountries.includes("KR");
    const isTurkish = originCountries.includes("TR");

    if (isAnimation) {
        type = "أنمي ورسوم متحركة";
        keywords = ["مشاهدة أنمي", "تحميل حلقات أنمي", "قصة أنمي", "أبطال صوت أنمي", "تقييم أنمي"];
    } else if (isKorean) {
        type = "دراما كورية (K-Drama)";
        keywords = ["مشاهدة مسلسل كوري", "تحميل مسلسل كوري", "قصة العمل الكوري", "أبطال المسلسل الكوري"];
    } else if (isTurkish) {
        type = "دراما تركية";
        keywords = ["مشاهدة مسلسل تركي", "تحميل المسلسل التركي", "قصة وأحداث", "نهاية المسلسل التركي"];
    }
    
    return { type, keywords };
}

/**
 * دالة توليد المقال البرمجي بأسلوب متغير لمنع تكرار المحتوى في جوجل
 */
function generateDynamicBody(title, year, type, overview, director, actors, rating, keywords) {
    const intros = [
        `نستعرض معكم اليوم في منصة MovoraStar قراءة نقدية معمقة ومراجعة شاملة لآخر مستجدات عالم السينما والترفيه، حيث نسلط الضوء على ${type} الشهير **${title}** الصادر عام ${year}.`,
        `ترحب بكم منصة MovoraStar في مراجعتها الفنية الحصرية؛ حيث نغوص اليوم في تفاصيل العمل المثير للجدل وعشاق الفن، وهو ${type} المتميز **${title}** (${year}).`
    ];
    
    // اختيار مقدمة عشوائية برمجياً لمنع التكرار الجاف
    const chosenIntro = intros[Math.floor(Math.random() * intros.length)];

    return `
<p>${chosenIntro} يعتبر هذا العمل قفزة نوعية في سياق الإنتاجات الحالية، وحقق تقييماً جماهيرياً متميزاً قُدر بنحو ${rating} من 10 على منصات التقييم العالمية.</p>

<h2>قصة ${title} وأبرز الخطوط الدرامية</h2>
<p>تتمحور فكرة وعقدة العمل حول أحداث مشوقة ومثيرة تلامس اهتمامات المشاهدين، حيث تشير البيانات الرسمية إلى الحبكة التالية:</p>
<blockquote class="movorastar-quote">${overview}</blockquote>
<p>تتصاعد مجريات الأحداث لتضع الشخصيات أمام تحديات غير متوقعة، مما يدفع المشاهد للتساؤل المستمر حول المآل الذي ستؤول إليه القصة في النهاية.</p>

<h2>مراجعة وتقييم أبطال العمل والركائز الفنية</h2>
<p>قاد هذا العمل طاقم متميز يضم نخبة من المبدعين وهم: ${actors}. وقد أشرف على صياغة الرؤية الفنية والإخراجية المخرج المبدع ${director}.</p>
<p>تكامل الأداء الفني والجمالي للعمل مع زوايا التصوير وهندسة الألوان البصرية، مما ساهم في خلق تجربة ترفيهية حية جعلت العمل يستحق التوصية والمتابعة.</p>

<h2>دليل الكلمات المفتاحية والبحث الشائع للعمل</h2>
<ul>
    <li>${keywords[0]} ${title} مترجم كامل</li>
    <li>${keywords[1]} ${title} بجودة عالية</li>
    <li>${keywords[2]} والتحليل النقدي للأحداث</li>
    <li>${keywords[3]} وتفاصيل الشخصيات المؤثرة</li>
</ul>
    `;
}

// المسار البرمجي الرئيسي لاستقبال الطلبات (API Endpoint)
app.post('/api/generate-article', async (req, res) => {
    const { query, isTv } = req.body;
    if (!query) return res.status(400).json({ error: "الرجاء إدخل اسم العمل أو الـ ID" });

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        // البحث برمجياً عن الفيلم لجلب الـ ID إذا أدخل المستخدم اسماً نصياً
        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ar`);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                movieId = searchRes.data.results[0].id;
            } else {
                return res.status(404).json({ error: "لم يتم العثور على نتائج" });
            }
        }

        // جلب تفاصيل العمل الفني الكاملة
        const detailsRes = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,images&language=ar&include_image_language=en,null`);
        const data = detailsRes.data;

        const title = data.title || data.name || "عمل غير معنون";
        const releaseYear = (data.release_date || data.first_air_date || "2026").split('-')[0];
        const rating = data.vote_average ? data.vote_average.toFixed(1) : "7.5";
        const overview = data.overview || "تتداخل الأحداث الفنية للعمل في سياق درامي وتثقيفي ممتع يستحق المتابعة اللحظية.";
        const genres = data.genres || [];
        const countries = data.origin_country || [];

        const { type, keywords } = analyzeWorkType(genres, countries);

        let director = "نخبة من صناع السينما";
        if (data.credits && data.credits.crew) {
            const dir = data.credits.crew.find(c => c.job === "Director" || c.job === "Executive Producer");
            if (dir) director = dir.name;
        }
        let actors = "مجموعة من ألمع النجوم";
        if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
            actors = data.credits.cast.slice(0, 4).map(a => a.name).join(' ، ');
        }

        // توليد أكواد الحماية والسيو (JSON-LD Schemas) لجوجل
        const jsonLdSchemas = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://movorastar.com/#article",
      "headline": "دليل مشاهدة ${type} ${title} (${releaseYear}) مترجم كامل أون لاين",
      "description": "مشاهدة وتحميل ${type} ${title} صادر عام ${releaseYear}. مراجعة شاملة للقصة والأبطال والسيو المنظم.",
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

        const articleBody = generateDynamicBody(title, releaseYear, type, overview, director, actors, rating, keywords);
        const finalBloggerHTML = `${jsonLdSchemas}\n<div class="movorastar-container">\n${articleBody}\n</div>`;

        // إرسال النتيجة البرمجية النهائية
        res.json({
            title: title,
            searchDescription: `مشاهدة ${type} ${title} (${releaseYear}) مترجم كامل. قصة العمل، مراجعة نقدية، وتحميل مباشر عبر MovoraStar.`,
            html: finalBloggerHTML
        });

    } catch (err) {
        res.status(500).json({ error: "فشل الخادم في معالجة البيانات" });
    }
});

// تشغيل الخادم محلياً في بيئة التطوير
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
