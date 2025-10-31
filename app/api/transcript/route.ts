import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId)

    const transcript = transcriptData
      .map((item: any) => item.text)
      .join(' ')
      .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
      .replace(/\s+/g, ' ')
      .trim()

    return NextResponse.json({ transcript })

  } catch (error: any) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json(
      { error: 'Could not fetch transcript for this video' },
      { status: 404 }
    )
  }
}
