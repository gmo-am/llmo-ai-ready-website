// app/api/ai-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // ← ここを実際に使います
});

interface AIAnalysisRequest {
  url: string;
  htmlContent: string;
  currentChecks: any[];
}

async function generateAIInsights(
  url: string,
  htmlContent: string,
  currentChecks: any[]
) {
  // OpenAI で直接生成（JSON で返させる）
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 手軽&安定。必要なら上位モデルに変更可
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an AI readiness expert analyzing websites for ANY industry (e-commerce, news, education, healthcare, business, etc). Provide industry-appropriate recommendations. Be specific with examples relevant to the site type. Return only JSON.',
        },
        {
          role: 'user',
          content: [
            `Analyze this webpage for AI readiness. This could be ANY type of site - adapt your analysis accordingly.`,
            ``,
            `URL: ${url}`,
            `Page-Level Scores: ${JSON.stringify(
              (currentChecks || [])
                .filter((c: any) =>
                  ['readability', 'heading-structure', 'meta-tags'].includes(
                    c.id
                  )
                )
                .map((c: any) => `${c.label}: ${c.score}`)
            )}`,
            ``,
            `Analyze these universal AI readiness factors:`,
            `1. Content Quality for AI (content-quality) - Is the content clear, factual, and valuable for AI training?`,
            `2. Information Architecture (info-architecture) - How well organized and categorized is the information?`,
            `3. Semantic Structure (semantic-structure) - Does the HTML properly describe content meaning?`,
            `4. AI Discovery Value (ai-discovery) - Can AI systems easily understand what this page/site offers?`,
            `5. Knowledge Extraction (knowledge-extraction) - Can facts, entities, and relationships be extracted?`,
            `6. Context & Completeness (context-completeness) - Is there enough context for AI to understand topics?`,
            `7. Content Uniqueness (content-uniqueness) - Is this original content vs duplicated/thin content?`,
            `8. Machine Interpretability (machine-interpretability) - How easily can AI parse and understand this?`,
            ``,
            `Return JSON with 'insights' array of objects {id, label, score(0-100), status(pass|warning|fail), details, recommendation, actionItems(array of 5 specific actions)}.`,
            `Also include 'overallAIReadiness' (string) and 'topPriorities' (array of strings).`,
          ].join('\n'),
        },
      ],
      // Next.js のAPIで大き過ぎる応答を避ける場合は max_tokens を調整
      max_tokens: 2000,
    });

    const content =
      completion.choices?.[0]?.message?.content?.trim() || '{}';

    // response_format=json_object を使っているので JSON のはずだが、念のため try/catch
    try {
      const parsed = JSON.parse(content);
      // 最低限の形を保証
      return {
        insights: parsed.insights ?? [],
        overallAIReadiness: parsed.overallAIReadiness ?? '',
        topPriorities: parsed.topPriorities ?? [],
      };
    } catch (e) {
      console.error('OpenAI JSON parse error:', e, 'raw:', content.slice(0, 200));
      return generateMockInsights(url);
    }
  } catch (err) {
    console.error('OpenAI API error:', err);
    return generateMockInsights(url);
  }
}

function generateMockInsights(url: string = 'https://example.com') {
  return {
    insights: [
      {
        id: 'content-quality',
        label: 'Content Quality for AI',
        score: 75,
        status: 'warning',
        details:
          'Content is generally well-structured with clear paragraphs and headings. Some sections could benefit from better semantic markup.',
        recommendation:
          'Great structure! Your headings are descriptive and paragraphs are well-organized.',
        actionItems: [
          'Example of good heading: "How to Configure API Authentication" instead of "Setup"',
          'Keep paragraphs under 150 words (yours average 120 - excellent!)',
          'Add a TL;DR section like: <section class="tldr">Key points...</section>',
          'Start each section with a clear topic sentence that summarizes the content',
        ],
      },
      // …（既存のモックは省略可。必要ならそのまま残してOK）
    ],
    overallAIReadiness:
      'The website shows moderate AI readiness with good basic structure but needs enhancement in data structuring and API accessibility.',
    topPriorities: [
      'Implement comprehensive structured data schemas',
      'Create API endpoints for content access',
      'Enhance content depth and completeness',
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { url, htmlContent, currentChecks } =
      (await request.json()) as AIAnalysisRequest;

    if (!url || !htmlContent) {
      return NextResponse.json(
        { error: 'URL and HTML content are required' },
        { status: 400 }
      );
    }

    const insights = await generateAIInsights(
      url,
      htmlContent,
      currentChecks || []
    );

    return NextResponse.json({
      success: true,
      insights: insights.insights || [],
      overallAIReadiness: insights.overallAIReadiness || '',
      topPriorities: insights.topPriorities || [],
    });
  } catch (error) {
    console.error('AI Analysis error:', error);
    // 失敗時は mock 返却（元の挙動を踏襲）
    try {
      const { url } = await request.clone().json();
      const mockData = generateMockInsights(url || 'https://example.com');
      return NextResponse.json({ success: true, ...mockData });
    } catch {
      const mockData = generateMockInsights('https://example.com');
      return NextResponse.json({ success: true, ...mockData });
    }
  }
}
