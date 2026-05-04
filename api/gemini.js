// 這是 Vercel Serverless Function
// 它會在伺服器端執行，因此瀏覽器端(前端)無法看到這裡的程式碼與環境變數

export default async function handler(req, res) {
  // 1. 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  // 2. 從 Vercel 的環境變數中安全地讀取 Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器未設定 GEMINI_API_KEY 環境變數' });
  }

  // 3. 組合要發送給 Google 的真實 URL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`;

  try {
    // 4. 將前端傳來的資料 (req.body) 轉發給 Google 伺服器
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`Google API 回應錯誤: ${response.status}`);
    }

    const data = await response.json();
    
    // 5. 將結果回傳給你的前端 React 應用程式
    res.status(200).json(data);
  } catch (error) {
    console.error('Gemini API 代理請求失敗:', error);
    res.status(500).json({ error: '無法連接到 Gemini 服務' });
  }
}