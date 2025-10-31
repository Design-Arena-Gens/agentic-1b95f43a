import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { styleAnalysis, topic } = await request.json()

    if (!styleAnalysis || !topic) {
      return NextResponse.json(
        { error: 'Style analysis and topic are required' },
        { status: 400 }
      )
    }

    const prompt = `Based on this script-writing style guide:

${styleAnalysis}

Write a complete YouTube video script about: "${topic}"

The script should:
- Match the tone, voice, and pacing described in the style guide
- Use similar sentence structures and expressions
- Follow the same opening and closing patterns
- Engage the audience in the same way
- Maintain the same level of formality/casualness
- Include any unique stylistic elements mentioned

Write a complete, ready-to-use script (approximately 2-3 minutes of content).`

    const openaiKey = process.env.OPENAI_API_KEY

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert scriptwriter who can perfectly mimic any writing style.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate script')
    }

    const data = await response.json()
    const script = data.choices[0].message.content

    return NextResponse.json({ script })

  } catch (error: any) {
    console.error('Error generating script:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the script' },
      { status: 500 }
    )
  }
}
