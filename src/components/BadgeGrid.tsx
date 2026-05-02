import {
  MessageSquare,
  Sparkles,
  Flame,
  Calendar,
  Star,
  Users,
  Heart,
  MapPin,
  LayoutGrid,
  BookOpen,
} from 'lucide-react'

const BADGE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  MessageSquare,
  Sparkles,
  Flame,
  Calendar,
  Star,
  Users,
  Heart,
  MapPin,
  LayoutGrid,
  BookOpen,
}

export interface BadgeItem {
  id: string
  name: string
  description: string
  lucideIcon: string
  earned: boolean
  earnedAt?: string
}

export interface BadgeGridProps {
  badges: BadgeItem[]
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div data-testid="badge-grid" className="grid grid-cols-2 gap-3">
      {badges.map((badge) => {
        const IconComponent = BADGE_ICON_MAP[badge.lucideIcon] ?? null

        return (
          <div
            key={badge.id}
            data-testid={`badge-card-${badge.id}`}
            data-earned={String(badge.earned)}
            className={[
              'flex flex-col items-center gap-1 rounded-lg p-3 text-center',
              badge.earned
                ? 'bg-green-50 text-green-800'
                : 'bg-muted text-muted-foreground',
            ].join(' ')}
          >
            {IconComponent && (
              <IconComponent size={20} className={badge.earned ? 'text-green-600' : 'text-gray-400'} />
            )}
            <span className="text-xs font-semibold">{badge.name}</span>
            {badge.earned && badge.earnedAt ? (
              <span data-testid={`badge-earnedAt-${badge.id}`} className="text-xs">
                {badge.earnedAt}
              </span>
            ) : (
              <span className="text-xs">{badge.description}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
