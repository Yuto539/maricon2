import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BondLevelGauge from './BondLevelGauge'

describe('BondLevelGauge', () => {
  // Label rendering for all 5 ranges
  it('renders "はじめまして" for bondLevel 0', () => {
    render(<BondLevelGauge bondLevel={0} />)
    expect(screen.getByText('はじめまして')).toBeInTheDocument()
  })

  it('renders "はじめまして" for bondLevel 20', () => {
    render(<BondLevelGauge bondLevel={20} />)
    expect(screen.getByText('はじめまして')).toBeInTheDocument()
  })

  it('renders "知り合い" for bondLevel 21', () => {
    render(<BondLevelGauge bondLevel={21} />)
    expect(screen.getByText('知り合い')).toBeInTheDocument()
  })

  it('renders "知り合い" for bondLevel 40', () => {
    render(<BondLevelGauge bondLevel={40} />)
    expect(screen.getByText('知り合い')).toBeInTheDocument()
  })

  it('renders "友達感覚" for bondLevel 41', () => {
    render(<BondLevelGauge bondLevel={41} />)
    expect(screen.getByText('友達感覚')).toBeInTheDocument()
  })

  it('renders "友達感覚" for bondLevel 60', () => {
    render(<BondLevelGauge bondLevel={60} />)
    expect(screen.getByText('友達感覚')).toBeInTheDocument()
  })

  it('renders "気になる存在" for bondLevel 61', () => {
    render(<BondLevelGauge bondLevel={61} />)
    expect(screen.getByText('気になる存在')).toBeInTheDocument()
  })

  it('renders "気になる存在" for bondLevel 80', () => {
    render(<BondLevelGauge bondLevel={80} />)
    expect(screen.getByText('気になる存在')).toBeInTheDocument()
  })

  it('renders "深い関係" for bondLevel 81', () => {
    render(<BondLevelGauge bondLevel={81} />)
    expect(screen.getByText('深い関係')).toBeInTheDocument()
  })

  it('renders "深い関係" for bondLevel 100', () => {
    render(<BondLevelGauge bondLevel={100} />)
    expect(screen.getByText('深い関係')).toBeInTheDocument()
  })

  // Color per level
  it('applies level-1 color for bondLevel 10 (0-20 range)', () => {
    render(<BondLevelGauge bondLevel={10} />)
    const gauge = screen.getByTestId('bond-gauge-svg')
    expect(gauge).toHaveAttribute('data-color', '#D4CFC8')
  })

  it('applies level-2 color for bondLevel 30 (21-40 range)', () => {
    render(<BondLevelGauge bondLevel={30} />)
    const gauge = screen.getByTestId('bond-gauge-svg')
    expect(gauge).toHaveAttribute('data-color', '#C4B09A')
  })

  it('applies level-3 color for bondLevel 50 (41-60 range)', () => {
    render(<BondLevelGauge bondLevel={50} />)
    const gauge = screen.getByTestId('bond-gauge-svg')
    expect(gauge).toHaveAttribute('data-color', '#C19B8A')
  })

  it('applies level-4 color for bondLevel 70 (61-80 range)', () => {
    render(<BondLevelGauge bondLevel={70} />)
    const gauge = screen.getByTestId('bond-gauge-svg')
    expect(gauge).toHaveAttribute('data-color', '#B07D6A')
  })

  it('applies level-5 color for bondLevel 90 (81-100 range)', () => {
    render(<BondLevelGauge bondLevel={90} />)
    const gauge = screen.getByTestId('bond-gauge-svg')
    expect(gauge).toHaveAttribute('data-color', '#A0614F')
  })

  // Trend display
  it('shows "上昇傾向" when bondLevel increased from previousLevel', () => {
    render(<BondLevelGauge bondLevel={60} previousLevel={40} />)
    expect(screen.getByText('上昇傾向')).toBeInTheDocument()
  })

  it('shows "下降傾向" when bondLevel decreased from previousLevel', () => {
    render(<BondLevelGauge bondLevel={30} previousLevel={50} />)
    expect(screen.getByText('下降傾向')).toBeInTheDocument()
  })

  it('hides trend when no previousLevel', () => {
    render(<BondLevelGauge bondLevel={50} />)
    expect(screen.queryByText('上昇傾向')).not.toBeInTheDocument()
    expect(screen.queryByText('下降傾向')).not.toBeInTheDocument()
  })

  it('hides trend when level unchanged', () => {
    render(<BondLevelGauge bondLevel={50} previousLevel={50} />)
    expect(screen.queryByText('上昇傾向')).not.toBeInTheDocument()
    expect(screen.queryByText('下降傾向')).not.toBeInTheDocument()
  })

  it('renders with default size md when no size prop', () => {
    render(<BondLevelGauge bondLevel={50} />)
    const container = screen.getByTestId('bond-gauge-container')
    expect(container).toHaveAttribute('data-size', 'md')
  })

  it('renders with size sm when specified', () => {
    render(<BondLevelGauge bondLevel={50} size="sm" />)
    const container = screen.getByTestId('bond-gauge-container')
    expect(container).toHaveAttribute('data-size', 'sm')
  })

  it('renders with size lg when specified', () => {
    render(<BondLevelGauge bondLevel={50} size="lg" />)
    const container = screen.getByTestId('bond-gauge-container')
    expect(container).toHaveAttribute('data-size', 'lg')
  })
})
