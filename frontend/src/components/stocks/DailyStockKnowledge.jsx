import { useEffect, useState } from 'react'
import { BookOpen, Lightbulb } from 'lucide-react'
import { getDailyStockKnowledge } from '../../services/stockInfoService'

export default function DailyStockKnowledge() {
  const [knowledgeItems, setKnowledgeItems] = useState([])

  useEffect(() => {
    getDailyStockKnowledge().then(setKnowledgeItems)
  }, [])

  if (!knowledgeItems.length) return <p className="stock-empty">오늘의 주식 기초 지식을 불러오는 중입니다.</p>

  return (
    <section className="stock-info-section card">
      <div className="stock-info-header">
        <div>
          <h2 className="section-title">오늘의 주식 지식</h2>
          <p>{knowledgeItems[0].basedAt} 기준 기초 학습 콘텐츠 3개</p>
        </div>
        <span className="stock-info-badge">기초 3개</span>
      </div>

      <div className="stock-knowledge-list">
        {knowledgeItems.map((knowledge) => (
          <article key={knowledge.id} className="stock-knowledge-card">
            <div className="stock-knowledge-title">
              <BookOpen size={20} aria-hidden />
              <div>
                <span>{knowledge.level}</span>
                <h3>{knowledge.title}</h3>
              </div>
            </div>
            <p className="stock-info-summary">{knowledge.summary}</p>

            <div className="stock-info-block">
              <strong>핵심 포인트</strong>
              <ul>
                {knowledge.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="stock-knowledge-example">
              <Lightbulb size={17} aria-hidden />
              <div>
                <strong>예시</strong>
                <p>{knowledge.example}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
