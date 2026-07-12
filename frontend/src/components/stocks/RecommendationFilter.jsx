import { INVESTMENT_HORIZON_OPTIONS, MARKET_SCOPE_OPTIONS, PRODUCT_TYPE_OPTIONS } from '../../data/mockRecommendations'

export default function RecommendationFilter({
  marketScope,
  productType,
  horizonType,
  onMarketChange,
  onProductChange,
  onHorizonChange,
  disabled,
}) {
  return (
    <div className="stock-option-panel card">
      <div className="stock-option-group">
        <h2 className="section-title">시장 옵션</h2>
        <div className="stock-option-list" role="group" aria-label="시장 옵션 선택">
          {MARKET_SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`stock-option-btn ${marketScope === option.value ? 'active' : ''}`}
              onClick={() => onMarketChange(option.value)}
              disabled={disabled}
              aria-pressed={marketScope === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stock-option-group">
        <h2 className="section-title">상세 옵션</h2>
        <div className="stock-option-list" role="group" aria-label="상세 옵션 선택">
          {PRODUCT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`stock-option-btn ${productType === option.value ? 'active' : ''}`}
              onClick={() => onProductChange(option.value)}
              disabled={disabled}
              aria-pressed={productType === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stock-option-group">
        <h2 className="section-title">투자 기간</h2>
        <div className="stock-option-list" role="group" aria-label="투자 기간 선택">
          {INVESTMENT_HORIZON_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`stock-option-btn ${horizonType === option.value ? 'active' : ''}`}
              onClick={() => onHorizonChange(option.value)}
              disabled={disabled}
              aria-pressed={horizonType === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
