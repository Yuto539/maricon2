'use client'

import { useState } from 'react'

export interface PartnerFormValues {
  nickname: string
  age?: number
  occupation?: string
  metVia?: string
  profileNotes?: string
  tags: string[]
}

export interface PartnerFormProps {
  initialValues?: PartnerFormValues
  onSubmit: (values: PartnerFormValues) => void
  isLoading?: boolean
}

export default function PartnerForm({
  initialValues,
  onSubmit,
  isLoading = false,
}: PartnerFormProps) {
  const [nickname, setNickname] = useState(initialValues?.nickname ?? '')
  const [age, setAge] = useState<string>(
    initialValues?.age !== undefined ? String(initialValues.age) : '',
  )
  const [occupation, setOccupation] = useState(initialValues?.occupation ?? '')
  const [metVia, setMetVia] = useState(initialValues?.metVia ?? '')
  const [profileNotes, setProfileNotes] = useState(initialValues?.profileNotes ?? '')
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [nicknameError, setNicknameError] = useState('')

  const isEditing = initialValues !== undefined

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    setTags((prev) => [...prev, trimmed])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setNicknameError('ニックネームは必須です')
      return
    }
    setNicknameError('')
    onSubmit({
      nickname,
      age: age !== '' ? Number(age) : undefined,
      occupation: occupation || undefined,
      metVia: metVia || undefined,
      profileNotes: profileNotes || undefined,
      tags,
    })
  }

  const isSubmitDisabled = !nickname.trim() || isLoading

  return (
    <form onSubmit={handleSubmit} aria-label="パートナーフォーム">
      <div className="flex flex-col gap-4">
        {/* Nickname */}
        <div className="flex flex-col gap-1">
          <label htmlFor="nickname" className="text-sm font-medium">
            ニックネーム <span className="text-destructive">*</span>
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="rounded border border-input px-3 py-2 text-sm"
            placeholder="例: さくらちゃん"
          />
          {nicknameError && (
            <p className="text-xs text-destructive">{nicknameError}</p>
          )}
        </div>

        {/* Age */}
        <div className="flex flex-col gap-1">
          <label htmlFor="age" className="text-sm font-medium">
            年齢
          </label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={18}
            max={99}
            className="rounded border border-input px-3 py-2 text-sm"
            placeholder="例: 25"
          />
        </div>

        {/* Occupation */}
        <div className="flex flex-col gap-1">
          <label htmlFor="occupation" className="text-sm font-medium">
            職業
          </label>
          <input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="rounded border border-input px-3 py-2 text-sm"
            placeholder="例: 看護師"
          />
        </div>

        {/* Met via */}
        <div className="flex flex-col gap-1">
          <label htmlFor="metVia" className="text-sm font-medium">
            出会った場所
          </label>
          <input
            id="metVia"
            type="text"
            value={metVia}
            onChange={(e) => setMetVia(e.target.value)}
            className="rounded border border-input px-3 py-2 text-sm"
            placeholder="例: マッチングアプリ"
          />
        </div>

        {/* Profile notes */}
        <div className="flex flex-col gap-1">
          <label htmlFor="profileNotes" className="text-sm font-medium">
            メモ
          </label>
          <textarea
            id="profileNotes"
            value={profileNotes}
            onChange={(e) => setProfileNotes(e.target.value)}
            className="rounded border border-input px-3 py-2 text-sm"
            rows={3}
            placeholder="相手に関するメモを入力..."
          />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">タグ</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              className="flex-1 rounded border border-input px-3 py-2 text-sm"
              placeholder="タグを追加..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              追加
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`${tag} を削除`}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isEditing ? '更新する' : '登録する'}
        </button>
      </div>
    </form>
  )
}
