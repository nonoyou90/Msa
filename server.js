// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenAI } = require('@google/generative-ai'); // استدعاء مكتبة الذكاء الاصطناعي

const app = express();
app.use(cors());
app.use(express.json());

// قراءة المفاتيح السرية من بيئة Vercel الآمنة
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// تهيئة محرك الذكاء الاصطناعي
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.post('/api/generate-article', async (req, res) => {
    const { query, isTv } = req.body;
    if (!query) return res.status(400).json({ error: "الرجاء إدخال اسم العمل أو الـ ID" });

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        // 1. البحث عن معرف العمل في TMDB
        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ar`);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                movieId = searchRes.data.results[0].id;
            } else {
                return res.status(404).json({ error: "لم يتم العثور على نتائج" });
            }
        }

        // 2. جلب البيانات التفصيلية وطاقم العمل
        const detailsRes = await axios.get(`https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits&language=ar`);
        const data = detailsRes.data;

        const title = data.title || data.name;
        const releaseYear = (data.release_date || data.first_air_date || "2026").split('-')[0];
        const overview = data.overview || "";
        const rating = data.vote_average ? data.vote_average.toFixed(1) : "7.5";
        
        let director = "غير معروف";
        if (data.credits && data.credits.crew) {
            const dir = data.credits.crew.find(c => c.job === "Director" || c.job === "Executive Producer");
            if (dir) director = dir.name;
        }
        let actors = data.credits?.cast?.slice(0, 5).map(a => a.name).join(' ، ') || "";

        // 3. استدعاء الذكاء الاصطناعي لتوليد محتوى المقال بعمق وتجنب التكرار
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        أنت كاتب محترف في موقع MovoraStar المتخصص في نقد الأفلام والمسلسلات وسيو طويل المدى.
        اكتب مقالاً نقدياً شاملاً وحصرياً باللغة العربية عن ${isTv ? 'مسلسل' : 'فيلم'} اسمه "${title}" صدر عام ${releaseYear}.
        
        معلومات أساسية للعمل لتعتمد عليها:
        - القصة التمهيدية: ${overview}
        - المخرج: ${director}
        - الممثلين: ${actors}
        
        يجب أن يحتوي المقال على الأقسام التالية مقسمة بوسوم HTML قياسية ونظيفة (مثل h2 و p و blockquote) ودون أي inline styles:
        1. مقدمة جذابة ومغايرة تماماً.
        2. تحليل عميق وشرح للأحداث والنهاية المتوقعة أو الفعلية للعمل.
        3. مراجعة نقدية تشمل نقاط القوة ونقاط الضعف الفنية.
        4. الرسائل والأهداف التي يطرحها العمل للمشاهد.
        5. فقرة استهداف كلمات مفتاحية مثل (مشاهدة فيلم ${title}، قصة ${title}، مراجعة ${title}، تقييم ${title}).
        
        اجعل الأسلوب بشرياً شيقاً وممتازاً لمحركات البحث. لا تضع وسوم html أو body كاملة، فقط محتوى المقال الداخلي.
        `;

        const aiResponse = await model.generateContent(prompt);
        const generatedText = aiResponse.response.text();

        // 4. توليد أكواد البيانات المنظمة السيو الاحترافية (JSON-LD)
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
            searchDescription: `مراجعة ${isTv ? 'مسلسل' : 'فيلم'} ${title} (${releaseYear}) مترجم. قصة العمل بالتفصيل، التحليل الفني والنقدي للنهاية عبر منصة MovoraStar.`,
            html: finalHTML
        });

    } catch (err) {
        console.error(error);
        res.status(500).json({ error: "فشل المحرك في توليد مقال الذكاء الاصطناعي" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running`));
