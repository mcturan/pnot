import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text, pageTitle } = await req.json() as { text: string; pageTitle?: string };

    if (!text || text.length < 10) {
      return NextResponse.json({ error: 'Text too short' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Sen PNOT isimli bir proje not defteri uygulamasının AI asistanısın.
Kullanıcı sana bir WhatsApp veya Telegram sohbeti yapıştırdı.
Bu konuşmayı analiz et ve proje notlarına dönüştür.

Kurallar:
- Sadece JSON döndür, başka hiçbir şey yazma
- Her mesajı anlamlı gruplara ayır
- Önemli kararları, görevleri ve bilgileri çıkar
- Sıradan sohbeti (merhaba, tamam, iyi günler vb.) çıkar
- Türkçe veya İngilizce ne geldiyse o dilde yaz

Çıktı formatı:
{
  "notes": [
    {
      "content": "not içeriği",
      "isTask": false,
      "taskStatus": "todo"  // sadece isTask:true ise
    }
  ],
  "summary": "Bu konuşmanın 1-2 cümlelik özeti"
}

Konuşma:
${text.slice(0, 4000)}`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    // Extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Parse failed' }, { status: 500 });

    const result = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI import error:', err);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
