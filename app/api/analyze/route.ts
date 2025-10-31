import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json()

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      )
    }

    // Extract channel ID from URL
    const channelId = extractChannelId(channelUrl)
    if (!channelId) {
      return NextResponse.json(
        { error: 'Invalid channel URL. Please provide a valid YouTube channel URL or ID.' },
        { status: 400 }
      )
    }

    // Fetch channel videos using YouTube Data API
    const apiKey = process.env.YOUTUBE_API_KEY

    // Get channel info
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${apiKey}`
    )

    if (!channelResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch channel information. Make sure the channel exists.' },
        { status: 400 }
      )
    }

    const channelData = await channelResponse.json()

    if (!channelData.items || channelData.items.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    const channelTitle = channelData.items[0].snippet.title
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads

    // Get recent videos
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
    )

    const playlistData = await playlistResponse.json()
    const videos = playlistData.items || []

    // Get transcripts for videos
    const transcripts = []
    for (const video of videos.slice(0, 5)) {
      const videoId = video.snippet.resourceId.videoId
      try {
        const transcriptResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/transcript?videoId=${videoId}`
        )
        if (transcriptResponse.ok) {
          const data = await transcriptResponse.json()
          if (data.transcript) {
            transcripts.push({
              title: video.snippet.title,
              transcript: data.transcript
            })
          }
        }
      } catch (e) {
        console.error(`Failed to get transcript for ${videoId}:`, e)
      }
    }

    if (transcripts.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch transcripts. The channel may not have captions enabled.' },
        { status: 400 }
      )
    }

    // Analyze style using AI
    const styleAnalysis = await analyzeScriptStyle(transcripts, channelTitle)

    return NextResponse.json({
      channelTitle,
      videosAnalyzed: transcripts.length,
      styleGuide: styleAnalysis,
      characteristics: extractCharacteristics(styleAnalysis)
    })

  } catch (error: any) {
    console.error('Error analyzing channel:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while analyzing the channel' },
      { status: 500 }
    )
  }
}

function extractChannelId(url: string): string | null {
  // Handle @username format
  const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/)
  if (handleMatch) {
    // For @username, we'll need to use the search API
    return `@${handleMatch[1]}`
  }

  // Handle /channel/UC... format
  const channelMatch = url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/)
  if (channelMatch) {
    return channelMatch[1]
  }

  // Handle /c/ format
  const customMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/)
  if (customMatch) {
    return customMatch[1]
  }

  // If it looks like a channel ID already
  if (url.match(/^UC[a-zA-Z0-9_-]+$/)) {
    return url
  }

  // If it's just text, treat as handle
  if (!url.includes('/') && !url.includes('.')) {
    return url.startsWith('@') ? url : `@${url}`
  }

  return null
}

async function analyzeScriptStyle(transcripts: any[], channelTitle: string): Promise<string> {
  const combinedTranscripts = transcripts
    .map(t => `Video: ${t.title}\n\n${t.transcript.substring(0, 3000)}`)
    .join('\n\n---\n\n')

  const prompt = `Analyze the script-writing style of the YouTube channel "${channelTitle}" based on these video transcripts:

${combinedTranscripts}

Provide a comprehensive style guide that captures:
1. Tone and voice (formal, casual, energetic, calm, etc.)
2. Sentence structure patterns (short and punchy, long and flowing, etc.)
3. Common phrases or expressions
4. Opening and closing patterns
5. Use of questions, rhetorical devices, or humor
6. Pacing and rhythm
7. How they engage with the audience
8. Any unique stylistic elements

Format this as a detailed style guide that can be used to write new scripts in this style.`

  try {
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
          { role: 'system', content: 'You are an expert at analyzing writing styles and creating style guides.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to analyze style with AI')
  }
}

function extractCharacteristics(styleGuide: string): string[] {
  const lines = styleGuide.split('\n').filter(line => line.trim())
  const characteristics = []

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].replace(/^[#\-*\d.]+\s*/, '').trim()
    if (line && line.length > 10 && line.length < 150) {
      characteristics.push(line)
    }
  }

  return characteristics.length > 0 ? characteristics : ['Style analysis completed']
}
