import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PartnerCard from './PartnerCard'

const basePartner = {
  id: 'p-1',
  nickname: 'さくら',
  metVia: 'マッチングアプリ',
  bondLevel: 55,
  streakDays: 10,
  lastContactAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  status: 'active' as const,
}

describe('PartnerCard', () => {
  it('renders nickname', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.getByText('さくら')).toBeInTheDocument()
  })

  it('renders metVia when present', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.getByText('マッチングアプリ')).toBeInTheDocument()
  })

  it('does not render metVia when absent', () => {
    const partnerWithoutMetVia = { ...basePartner, metVia: undefined }
    render(<PartnerCard partner={partnerWithoutMetVia} />)
    expect(screen.queryByTestId('partner-metvia')).not.toBeInTheDocument()
  })

  it('renders streak text with days count', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.getByText('10日継続中')).toBeInTheDocument()
  })

  it('renders "記録なし" when streakDays is 0', () => {
    const partnerNoStreak = { ...basePartner, streakDays: 0 }
    render(<PartnerCard partner={partnerNoStreak} />)
    expect(screen.getByText('記録なし')).toBeInTheDocument()
  })

  it('renders "盛り上がり中" for improving health trend', () => {
    render(<PartnerCard partner={basePartner} healthTrend="improving" />)
    expect(screen.getByText('盛り上がり中')).toBeInTheDocument()
  })

  it('renders "安定" for stable health trend', () => {
    render(<PartnerCard partner={basePartner} healthTrend="stable" />)
    expect(screen.getByText('安定')).toBeInTheDocument()
  })

  it('renders "停滞気味" for declining health trend', () => {
    render(<PartnerCard partner={basePartner} healthTrend="declining" />)
    expect(screen.getByText('停滞気味')).toBeInTheDocument()
  })

  it('renders nothing for trend when healthTrend is undefined', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.queryByTestId('health-trend')).not.toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    render(<PartnerCard partner={basePartner} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('partner-card'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows "終了" badge when status is ended', () => {
    const endedPartner = { ...basePartner, status: 'ended' as const }
    render(<PartnerCard partner={endedPartner} />)
    expect(screen.getByText('終了')).toBeInTheDocument()
  })

  it('does not show "終了" badge when status is active', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.queryByText('終了')).not.toBeInTheDocument()
  })

  it('renders BondLevelGauge with size sm', () => {
    render(<PartnerCard partner={basePartner} />)
    const gaugeContainer = screen.getByTestId('bond-gauge-container')
    expect(gaugeContainer).toHaveAttribute('data-size', 'sm')
  })

  it('shows relative time for lastContactAt when present', () => {
    render(<PartnerCard partner={basePartner} />)
    expect(screen.getByTestId('last-contact-time')).toBeInTheDocument()
  })

  it('hides last contact time when lastContactAt is absent', () => {
    const partnerNoContact = { ...basePartner, lastContactAt: undefined }
    render(<PartnerCard partner={partnerNoContact} />)
    expect(screen.queryByTestId('last-contact-time')).not.toBeInTheDocument()
  })
})
