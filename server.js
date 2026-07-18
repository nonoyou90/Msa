// server.js
// 1. استدعاء المكتبات البرمجية الأساسية لإدارة الشبكة والاتصالات
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// تفعيل برمجية CORS لضمان استقبال الطلبات من موقعك في بلوجر بأمان وبشكل مجاني
app.use(cors());
app.use(express.json()); 

// 2. جلب المفاتيح السرية المخزنة بأمان في بيئة Vercel
const TMDB_API_KEY = process.env.TMDB_API_KEY;
// ستقوم بإنشاء مفتاح مجاني من Hugging Face ووضعه في Vercel باسم HUGGINGFACE_API_KEY
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY; 

// المسار البرمجي المجاني بالكامل لتوليد مقالات السيو الاحترافية
app.post('/api/generate-article', async (req, res) => {
    const { query, isTv } = req.body;
    
    // التحقق البرمجي لمنع إرسال طلبات فارغة
    if (!query) {
        return res.status(400).json({ error: "تنبيه: حقل البحث فارغ، يرجى إدخال اسم العمل." });
    }

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        // أ. الاستعلام من قاعدة بيانات TMDB المجانية لجلب معرف العمل الفني (ID)
        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ar`);
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
        
        let director = "صناع السينما المحترفين";
        if (data.credits && data.credits.crew) {
            const dir = data.credits.crew.find(c => c.job === "Director" || c.job === "Executive Producer");
            if (dir) director = dir.name;
        }
        let actors = data.credits?.cast?.slice(0, 5).map(a => a.name).join(' ، ') || "";

        // ج. صياغة الموجه البرمجي الصارم والكامل الموجه للمحرك المجاني المفتوح
        const promptInstruction = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
        أنت ناقد سينمائي بشري محترف ومبدع تعمل ككاتب سيو رئيسي في منصة MovoraStar. 
        اكتب مقالاً نقدياً مطولاً باللغة العربية عن العمل السينمائي مباشرة وبشكل بشري نقي، دون ذكر أي مقدمات آلية أو أسماء شركات ذكاء اصطناعي.
        أنتج المحتوى مباشرة مقسماً بوسوم HTML قياسية (h2, p, blockquote, ul, li) دون كتابة وسوم html أو body الخارجية.<|eot_id|><|start_header_id|>user<|end_header_id|>
        اكتب المقال الفني لـ ${isTv ? 'مسلسل' : 'فيلم'} "${title}" الصادر عام ${releaseYear}.
        المعطيات:
        - القصة: ${overview}
        - المخرج: ${director}
        - الممثلين: ${actors}
        
        الأسلوب المطلوب: مقدمة سينمائية مشوقة، تحليل عميق للقصة وتفكيك العقدة الدرامية وشرح تفصيلي وموسع للنهاية، مراجعة نقدية توضح عناصر القوة والضعف، وقسم كلمات مفتاحية مدمجة مثل (مشاهدة فيلم ${title} مترجم، قصة مسلسل ${title}، مراجعة ونهاية ${title}).<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;

        // د. الاتصال بالسيرفر المجاني المفتوح (Llama 3) عبر Hugging Face API
        const hfResponse = await axios.post(
            'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
            {
                inputs: promptInstruction,
                parameters: {
                    max_new_tokens: 2048,
                    temperature: 0.7,
                    top_p: 0.9,
                    return_full_text: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // استخراج النص المولد من مصفوفة الاستجابة الخاصة بـ Hugging Face
        let generatedText = "";
        if (Array.isArray(hfResponse.data) && hfResponse.data[0]) {
            generatedText = hfResponse.data[0].generated_text || hfResponse.data[0].text;
        } else if (hfResponse.data.generated_text) {
            generatedText = hfResponse.data.generated_text;
        }

        // هـ. بناء البيانات المنظمة (JSON-LD Schema) لربط السيو بجوجل بشكل احترافي ومجاني
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

        const finalHTML = `${jsonLdSchemas}\n<div class="movorastar-post-body">\n${generatedText}\n</div>`;

        // إرجاع النتيجة النهائية لواجهة موقعك
        res.json({
            title: title,
            searchDescription: `تحليل ومراجعة ${isTv ? 'مسلسل' : 'فيلم'} ${title} (${releaseYear}). قصة العمل، قراءة فنية للنهاية والأبطال عبر MovoraStar.`,
            html: finalHTML
        });

    } catch (err) {
        console.error("خطأ فني في السيرفر المجاني:", err.message);
        res.status(500).json({ error: "واجه المحرك المجاني البديل ضغطاً، يرجى المحاولة مرة أخرى." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pure Free Llama Server Running`));
