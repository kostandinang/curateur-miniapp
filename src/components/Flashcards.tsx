import { Brain, ChevronLeft, ChevronRight, Clock, RotateCw, Trophy, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FlashcardWord {
  de: string
  en: string
  example: string
  type: string
  category: string
  gender?: string
  reflexive?: boolean
  separable?: boolean
}

interface FlashcardStats {
  total: number
  streak: number
  dailyGoal: number
}

type Level = 'A2' | 'B1'

const FLASHCARDS_DATA: Record<Level, FlashcardWord[]> = {
  A2: [
    {
      de: 'abholen',
      en: 'to pick up',
      example: 'Ich hole dich vom Bahnhof ab.',
      type: 'verb',
      category: 'daily',
    },
    {
      de: 'die Abmachung',
      en: 'agreement',
      example: 'Wir haben eine Abmachung getroffen.',
      type: 'noun',
      gender: 'f',
      category: 'business',
    },
    {
      de: 'anbieten',
      en: 'to offer',
      example: 'Darf ich dir etwas zu trinken anbieten?',
      type: 'verb',
      category: 'polite',
    },
    {
      de: 'die Anzeige',
      en: 'advertisement',
      example: 'Ich habe die Anzeige in der Zeitung gesehen.',
      type: 'noun',
      gender: 'f',
      category: 'media',
    },
    {
      de: 'sich ärgern',
      en: 'to be annoyed',
      example: 'Ich ärgere mich über den Lärm.',
      type: 'verb',
      reflexive: true,
      category: 'emotions',
    },
    {
      de: 'aufwachen',
      en: 'to wake up',
      example: 'Ich wache jeden Tag um 7 Uhr auf.',
      type: 'verb',
      separable: true,
      category: 'daily',
    },
    {
      de: 'die Ausbildung',
      en: 'education/training',
      example: 'Meine Ausbildung dauert drei Jahre.',
      type: 'noun',
      gender: 'f',
      category: 'education',
    },
    {
      de: 'sich ausruhen',
      en: 'to rest',
      example: 'Ich muss mich erst mal ausruhen.',
      type: 'verb',
      reflexive: true,
      category: 'health',
    },
    {
      de: 'der Bahnhof',
      en: 'train station',
      example: 'Der Zug fährt in 10 Minuten vom Bahnhof ab.',
      type: 'noun',
      gender: 'm',
      category: 'travel',
    },
    {
      de: 'sich beeilen',
      en: 'to hurry',
      example: 'Beeil dich, wir kommen zu spät!',
      type: 'verb',
      reflexive: true,
      category: 'daily',
    },
  ],
  B1: [
    {
      de: 'abhängen von',
      en: 'to depend on',
      example: 'Das hängt vom Wetter ab.',
      type: 'verb',
      separable: true,
      category: 'dependencies',
    },
    {
      de: 'die Ahnung',
      en: 'idea/clue',
      example: 'Ich habe keine Ahnung!',
      type: 'noun',
      gender: 'f',
      category: 'thinking',
    },
    {
      de: 'anerkennen',
      en: 'to recognize',
      example: 'Ich erkenne seine Leistung an.',
      type: 'verb',
      separable: true,
      category: 'communication',
    },
    {
      de: 'sich anpassen',
      en: 'to adapt',
      example: 'Ich muss mich an die neue Situation anpassen.',
      type: 'verb',
      separable: true,
      reflexive: true,
      category: 'change',
    },
    {
      de: 'anstrengend',
      en: 'tiring/demanding',
      example: 'Die Arbeit ist sehr anstrengend.',
      type: 'adjective',
      category: 'work',
    },
    {
      de: 'außerhalb',
      en: 'outside of',
      example: 'Außerhalb der Öffnungszeiten.',
      type: 'preposition',
      category: 'location',
    },
    {
      de: 'sich bedanken',
      en: 'to thank',
      example: 'Ich bedanke mich für die Einladung.',
      type: 'verb',
      reflexive: true,
      category: 'polite',
    },
    {
      de: 'bedeuten',
      en: 'to mean',
      example: 'Was bedeutet dieses Wort?',
      type: 'verb',
      category: 'communication',
    },
    {
      de: 'begreifen',
      en: 'to comprehend',
      example: 'Ich begreife nicht, warum.',
      type: 'verb',
      category: 'thinking',
    },
    {
      de: 'sich benehmen',
      en: 'to behave',
      example: 'Benimm dich bitte!',
      type: 'verb',
      reflexive: true,
      category: 'behavior',
    },
  ],
}

function Flashcards() {
  const [currentCard, setCurrentCard] = useState<number>(0)
  const [isFlipped, setIsFlipped] = useState<boolean>(false)
  const [level, setLevel] = useState<Level>('A2')
  const [learned, setLearned] = useState<string[]>([])
  const [stats, setStats] = useState<FlashcardStats>({ total: 0, streak: 12, dailyGoal: 10 })

  const cards: FlashcardWord[] = FLASHCARDS_DATA[level]
  const currentWord: FlashcardWord = cards[currentCard]

  useEffect(() => {
    setStats({
      total: 47,
      streak: 12,
      dailyGoal: 10,
    })
  }, [])

  const handleFlip = (): void => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = (): void => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentCard((prev) => (prev + 1) % cards.length)
    }, 150)
  }

  const handlePrev = (): void => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentCard((prev) => (prev - 1 + cards.length) % cards.length)
    }, 150)
  }

  const handleMarkLearned = (): void => {
    if (!learned.includes(currentWord.de)) {
      setLearned([...learned, currentWord.de])
    }
    handleNext()
  }

  const getTypeLabel = (word: FlashcardWord): string => {
    let label: string = word.type || 'word'
    if (word.gender) label += ` (${word.gender})`
    if (word.reflexive) label += ', reflexive'
    if (word.separable) label += ', separable'
    return label
  }

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      daily: '#f97316',
      emotions: '#ec4899',
      business: '#8b5cf6',
      education: '#0ea5e9',
      travel: '#22c55e',
      polite: '#f59e0b',
      health: '#ef4444',
      work: '#6366f1',
    }
    return colors[category] || '#6b7280'
  }

  return (
    <>
      {/* Header Stats */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
          borderRadius: '20px',
          padding: '24px',
          color: 'white',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              German Vocabulary
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, marginTop: '4px' }}>{stats.total}</div>
            <div style={{ fontSize: '15px', opacity: 0.9 }}>words learned</div>
          </div>

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={24} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Streak</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{stats.streak} 🔥</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Daily Goal</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{stats.dailyGoal}</div>
          </div>
          <div
            style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Level</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{level}</div>
          </div>
        </div>
      </div>

      {/* Level Selector */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {(['A2', 'B1'] as Level[]).map((l) => (
          <button
            type="button"
            key={l}
            onClick={() => {
              setLevel(l)
              setCurrentCard(0)
              setIsFlipped(false)
            }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: level === l ? '#ec4899' : 'var(--c-secondary-bg)',
              color: level === l ? 'white' : 'var(--c-hint)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Level {l}
          </button>
        ))}
      </div>

      {/* Flashcard Container with 3D Flip */}
      <div style={{ perspective: '1000px', marginBottom: '16px' }}>
        <button
          type="button"
          tabIndex={0}
          onClick={handleFlip}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleFlip()
            }
          }}
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '280px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'inherit',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          {/* Front Face */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              minHeight: '280px',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'var(--c-secondary-bg)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                background: `${getCategoryColor(currentWord.category)}20`,
                color: getCategoryColor(currentWord.category),
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              {currentWord.category}
            </div>

            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                marginBottom: '12px',
                color: 'var(--c-text)',
              }}
            >
              {currentWord.de}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
              {getTypeLabel(currentWord)}
            </div>

            <div
              style={{
                marginTop: '24px',
                padding: '10px 16px',
                background: 'var(--c-bg)',
                borderRadius: '10px',
                fontSize: '13px',
                color: 'var(--c-hint)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RotateCw size={14} />
              Tap to flip
            </div>
          </div>

          {/* Back Face */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              minHeight: '280px',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'var(--c-secondary-bg)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              transform: 'rotateY(180deg)',
            }}
          >
            <div
              style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#22c55e' }}
            >
              {currentWord.en}
            </div>

            <div style={{ fontSize: '14px', color: 'var(--c-hint)', marginBottom: '20px' }}>
              {currentWord.de}
            </div>

            <div
              style={{
                padding: '16px',
                background: 'var(--c-bg)',
                borderRadius: '12px',
                fontSize: '15px',
                color: 'var(--c-text)',
                fontStyle: 'italic',
                lineHeight: '1.5',
                width: '100%',
              }}
            >
              "{currentWord.example}"
            </div>

            <button
              type="button"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'var(--c-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Volume2 size={14} />
              Listen
            </button>
          </div>
        </button>
      </div>

      {/* Progress Dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '16px',
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={card.de}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                idx === currentCard
                  ? '#ec4899'
                  : learned.includes(cards[idx].de)
                    ? '#22c55e'
                    : 'var(--c-secondary-bg)',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--c-secondary-bg)',
            color: 'var(--c-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={handleMarkLearned}
          style={{
            flex: 1,
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: '#22c55e',
            color: 'white',
            fontSize: '15px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Trophy size={18} />
          Got it!
        </button>

        <button
          type="button"
          onClick={handleNext}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--c-secondary-bg)',
            color: 'var(--c-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Card Counter */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--c-hint)',
          marginBottom: '16px',
        }}
      >
        {currentCard + 1} / {cards.length}
      </div>

      {/* Daily Reminder */}
      <div className="card" style={{ fontSize: '13px', color: 'var(--c-hint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Clock size={14} />
          <span>Daily reminder at 10 PM</span>
        </div>
        <div>New words every day • A2/B1 Level</div>
      </div>
    </>
  )
}

export default Flashcards
