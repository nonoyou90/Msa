// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenAI } = require('@google/generative-ai'); 

const app = express();
app.use(cors());
app.use(express.json());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.post('/api/generate-article', async (req, res) => {
    const { query, isTv } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: "تنبيه: حقل البحث فارغ، يرجى إدخال اسم العمل." });
    }

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ar`);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                movieId = searchRes.data.results[0].id;
            } else {
                return res.status(404).json({ error: "لم يتم العثور على هذا العمل في قاعدة بيانات TMDB." });
            }
        }

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

        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash", 
            generationConfig: {
                temperature: 0.85, 
                topP: 0.95
            }
        });

        // تعديل الـ Prompt لمنع ذكر الاسم نهائياً
        const prompt = `
        أنت ناقد سينمائي بشري محترف ومبدع تعمل ككاتب سيو رئيسي في منصة MovoraStar.
        اكتب مقالاً نقدياً مطولاً باللغة العربية عن ${isTv ? 'مسلسل' : 'فيلم'} "${title}" الصادر عام ${releaseYear}.
        
        شروط صارمة: 
        - لا تذكر اسمك كـ "Gemini" أو "جيميني" أو "نموذج ذكاء اصطناعي" مطلقاً في أي مكان في النص.
        - اكتب بأسلوب بشري سينمائي خالص كأنك كاتب في مجلة سينمائية شهيرة.
        
        المعطيات الفنية:
        - القصة: ${overview}
        - المخرج: ${director}
        - الممثلين: ${actors}
        
        صغ المقال مباشرة بوسوم HTML نقية (h2, p, blockquote, ul, li) تشمل: مقدمة، تحليل عميق للقصة والنهاية الفلسفية، مراجعة نقدية لنقاط القوة والضعف، وقسم كلمات مفتاحية مدمجة مثل (مشاهدة فيلم ${title} مترجم، قصة مسلسل ${title}، مراجعة ونهاية ${title}).
        `;

        const aiResponse = await model.generateContent(prompt);
        let generatedText = aiResponse.response.text();

        // فحص وتطهير النص برمجياً لحذف أي ظهور للكلمة في حال خالفت الإرشادات
        generatedText = generatedText
            .replace(/gemini/gi, '') // حذف الكلمة بالإنجليزية بجميع حالات الأحرف
            .replace(/جيميني/g, '')  // حذف الكلمة بالعربية
            .replace(/جيمينى/g, ''); // حذف الكلمة بالياء المهملة

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

        res.json({
            title: title,
            searchDescription: `تحليل ومراجعة ${isTv ? 'مسلسل' : 'فيلم'} ${title} (${releaseYear}). قصة العمل، قراءة فنية للنهاية والأبطال عبر MovoraStar.`,
            html: finalHTML
        });

    } catch (err) {
        console.error("خطأ فني:", err.message);
        res.status(500).json({ error: "واجه المحرك ضغطاً، يرجى المحاولة مرة أخرى." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Clean Free Server Running`));
