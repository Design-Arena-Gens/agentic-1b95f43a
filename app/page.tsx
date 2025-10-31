'use client'

import { useState } from 'react'

export default function Home() {
  const [channelUrl, setChannelUrl] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [styleAnalysis, setStyleAnalysis] = useState<any>(null)
  const [generatedScript, setGeneratedScript] = useState('')
  const [error, setError] = useState('')

  const analyzeChannel = async () => {
    if (!channelUrl.trim()) {
      setError('Please enter a channel URL')
      return
    }

    setLoading(true)
    setAnalyzing(true)
    setError('')
    setStyleAnalysis(null)
    setGeneratedScript('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze channel')
      }

      setStyleAnalysis(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const generateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    if (!styleAnalysis) {
      setError('Please analyze a channel first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleAnalysis: styleAnalysis.styleGuide,
          topic
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate script')
      }

      setGeneratedScript(data.script)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            YouTube Script Style Analyzer
          </h1>
          <p className="text-gray-600 text-lg">
            Analyze any YouTube channel's script-writing style and generate new scripts in that style
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                YouTube Channel URL
              </label>
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@channelname or channel ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-800"
              />
            </div>

            <button
              onClick={analyzeChannel}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {analyzing ? 'Analyzing Channel...' : 'Analyze Channel Style'}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {styleAnalysis && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Style Analysis Complete!</h3>
              <div className="space-y-3 text-gray-700">
                <p><strong>Channel:</strong> {styleAnalysis.channelTitle}</p>
                <p><strong>Videos Analyzed:</strong> {styleAnalysis.videosAnalyzed}</p>
                <div>
                  <strong>Style Characteristics:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {styleAnalysis.characteristics?.map((char: string, idx: number) => (
                      <li key={idx}>{char}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {styleAnalysis && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Generate New Script
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Script Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter the topic for your new script..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800"
                />
              </div>

              <button
                onClick={generateScript}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {loading && !analyzing ? 'Generating Script...' : 'Generate Script'}
              </button>

              {generatedScript && (
                <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Generated Script</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedScript)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm leading-relaxed">
                    {generatedScript}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
