'use client'

import { useState } from 'react'
import type { DuoSession } from '@/lib/types'

interface DuoAnswerPageProps {
  session: DuoSession
  token: string
  bothAnswered: boolean
}

export default function DuoAnswerPage({ session, token, bothAnswered }: DuoAnswerPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const questions = session.questions
  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const totalQuestions = questions.length

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/duo/${token}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })

      if (!res.ok) {
        throw new Error('送信に失敗しました')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg font-semibold text-foreground">回答を送信しました</p>
        {bothAnswered && session.creatorAnswers && session.partnerAnswers && (
          <div className="w-full max-w-lg">
            <h2 className="mb-4 text-center font-semibold">お互いの回答</h2>
            <div className="flex flex-col gap-3">
              {questions.map((q) => (
                <div key={q.id} className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-sm font-medium">{q.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded bg-muted p-2 text-xs">
                      <div className="font-medium text-muted-foreground">あなた</div>
                      <div>{answers[q.id] ?? session.partnerAnswers?.[q.id] ?? '-'}</div>
                    </div>
                    <div className="rounded bg-muted p-2 text-xs">
                      <div className="font-medium text-muted-foreground">相手</div>
                      <div>{session.creatorAnswers?.[q.id] ?? '-'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!currentQuestion) {
    return <div className="p-4 text-muted-foreground">質問が見つかりません</div>
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col p-4">
      {/* Progress */}
      <div className="mb-6 text-center text-sm text-muted-foreground">
        {currentIndex + 1} / {totalQuestions}
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-lg font-medium text-foreground">{currentQuestion.text}</p>
      </div>

      {/* Options */}
      {currentQuestion.options && currentQuestion.options.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleOptionSelect(currentQuestion.id, option)}
              className={[
                'rounded-lg border px-4 py-3 text-left text-sm transition',
                answers[currentQuestion.id] === option
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Navigation */}
      <div className="mt-auto">
        {isLastQuestion ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !answers[currentQuestion.id]}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? '送信中...' : '回答する'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            次へ
          </button>
        )}
      </div>
    </div>
  )
}
