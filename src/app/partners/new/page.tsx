'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PartnerForm from '@/components/PartnerForm'
import { createClient } from '@/lib/supabase/client'
import type { PartnerFormValues } from '@/components/PartnerForm'

export default function NewPartnerPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: PartnerFormValues) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data, error: dbError } = await supabase
      .from('partners')
      .insert({
        user_id: user.id,
        nickname: values.nickname,
        age: values.age,
        occupation: values.occupation,
        met_via: values.metVia,
        profile_notes: values.profileNotes,
        tags: values.tags,
        status: 'active',
      })
      .select()
      .single()

    if (dbError || !data) {
      setError('登録に失敗しました')
      setIsLoading(false)
      return
    }

    router.push(`/partners/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-xl font-bold text-foreground">新しい相手を登録</h1>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <PartnerForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
