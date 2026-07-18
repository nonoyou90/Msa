// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// إعدادات CORS المتقدمة لضمان قبول الطلبات من أي مكان ومنع الخطأ في المتصفح
app.use(cors({
    origin: '*', // السماح لجميع النطاقات بما فيها بلوجر بالوصول للسيرفر
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ... بقية كود السيرفر وجلب البيانات من TMDB و Hugging Face كما هو دون تغيير ...
