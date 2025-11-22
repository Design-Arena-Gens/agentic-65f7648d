import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Sen oyun geliştirme konusunda uzman bir AI asistanısın. Kullanıcının isteklerine göre HTML, CSS ve JavaScript kullanarak oyunlar oluşturursun.

ÖNEMLİ KURALLAR:
1. Her zaman eksiksiz, çalışan bir HTML oyunu üret
2. Tüm kod tek bir HTML dosyasında olmalı (inline CSS ve JavaScript)
3. Oyun modern, responsive ve görsel olarak çekici olmalı
4. Canvas veya DOM manipülasyonu kullanabilirsin
5. Oyun kontrolleri açık ve kolay anlaşılır olmalı
6. Her oyunda restart/yeniden başlat butonu olmalı
7. Skor sistemi ekle (uygunsa)
8. Animasyonlar smooth ve performanslı olmalı

ÇıKTı FORMATI:
Her zaman şu formatta yanıt ver:

AÇIKLAMA: [Oyunun ne yaptığını kısaca açıkla]

KOD:
\`\`\`html
[Eksiksiz HTML kodu buraya]
\`\`\`

Örnek oyun türleri: Snake, Pong, Space Shooter, Flappy Bird benzeri, Memory Card, Tetris, vb.`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] }: { message: string; conversationHistory: Message[] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    // Build conversation history for Claude
    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Extract game code from response
    let gameCode = '';
    const codeMatch = assistantMessage.match(/```html\n([\s\S]*?)\n```/);

    if (codeMatch) {
      gameCode = codeMatch[1];
    }

    // Extract description (everything before the code block)
    let description = assistantMessage;
    if (codeMatch) {
      description = assistantMessage.split('```html')[0].trim();
    }

    return NextResponse.json({
      message: description || 'Oyun oluşturuldu! Sağ tarafta görüntüleyebilirsiniz.',
      gameCode: gameCode,
    });

  } catch (error: unknown) {
    console.error('Error generating game:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Oyun oluşturulurken bir hata oluştu',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
