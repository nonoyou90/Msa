// api/generate-article.js
// 1. استدعاء المكتبات البرمجية الأساسية لإدارة الشبكة
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// 2. تفعيل CORS الشامل لضمان استقبال طلبات المتصفح وبلوجر دون حظر
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 3. جلب مفاتيح البيئة السرية
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// 4. المسار الرئيسي لمعالجة طلبات توليد المقالات السينمائية
app.post('*', async (req, res) => {
    const { query, isTv } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: "تنبيه: حقل البحث فارغ، يرجى إدخال اسم العمل." });
    }

    try {
        let movieId = query;
        let mediaType = isTv ? 'tv' : 'movie';

        // أ. جلب بيانات المعرف من TMDB
        if (isNaN(query)) {
            const searchRes = await axios.get(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ar`);
            if (searchRes.data.results && searchRes.data.results.length > 0) {
                movieId = searchRes.data.results[0].id;
            } else {
                return res.status(404).json({ error: "لم يتم العثور على هذا العمل في قاعدة بيانات TMDB." });
            }
        }

        // ب. جلب التفاصيل الكاملة للعمل
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

        // ج. صياغة التوجيه لمحرك Llama 3 المجاني
        const promptInstruction = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
        أنت ناقد سينمائي بشري محترف ومبدع تعمل ككاتب سيو رئيسي في منصة MovoraStar. 
        اكتب مقالاً نقدياً مطولاً باللغة العربية عن العمل السينمائي مباشرة مقسماً بوسوم HTML قياسية (h2, p, blockquote, ul, li).<|eot_id|><|start_header_id|>user<|end_header_id|>
        اكتب المقال الفني لـ ${isTv ? 'مسلسل' : 'فيلم'} "${title}" الصادر عام ${releaseYear}.
        المعطيات: القصة: ${overview} | المخرج: ${director} | الممثلين: ${actors}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;

        // د. الاتصال بالمحرك المجاني المفتوح عبر Hugging Face
        const hfResponse = await axios.post(
            'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
            {
                inputs: promptInstruction,
                parameters: { max_new_tokens: 2048, temperature: 0.7 }
            },
            {
                headers: { 'Authorization': `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' }
            }
        );

        let generatedText = "";
        if (Array.isArray(hfResponse.data) && hfResponse.data[0]) {
            generatedText = hfResponse.data[0].generated_text || hfResponse.data[0].text;
        } else if (hfResponse.data.generated_text) {
            generatedText = hfResponse.data.generated_text;
        }

        const finalHTML = `<div class="movorastar-post-body">\n${generatedText}\n</div>`;

        // إرجاع النتيجة النهائية
        res.json({
            title: title,
            html: finalHTML
        });

    } catch (err) {
        console.error("خطأ فني:", err.message);
        res.status(500).json({ error: "واجه المحرك المجاني ضغطاً، يرجى المحاولة مرة أخرى." });
    }
});

// 5. التصدير البرمجي الهام جداً لمنصة Vercel لتعمل كدالة Serverless
module.exports = app;
