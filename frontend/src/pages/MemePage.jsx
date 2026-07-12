import { useState, useEffect, useRef } from 'react'
import { getTrendingMemes, getMemeVideos } from '../api'

export default function MemePage() {
  const [memes, setMemes] = useState([])
  const [memesLoading, setMemesLoading] = useState(true)
  const [memesError, setMemesError] = useState(null)

  const [selectedMeme, setSelectedMeme] = useState(null)
  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videosError, setVideosError] = useState(null)

  const [videoDialog, setVideoDialog] = useState(null)
  const videoSectionRef = useRef(null)

  useEffect(() => {
    setMemesLoading(true)
    setMemesError(null)
    getTrendingMemes()
      .then((res) => setMemes(res || []))
      .catch((e) => setMemesError(e.message || '밈 목록을 불러오지 못했습니다.'))
      .finally(() => setMemesLoading(false))
  }, [])

  // 밈을 클릭하면 결과 섹션이 화면 아래쪽에 새로 생기는데, 스크롤하지 않으면 눈에 안 띄어서
  // 선택이 바뀔 때마다 결과 섹션으로 자동 스크롤한다.
  useEffect(() => {
    if (selectedMeme && videoSectionRef.current) {
      videoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedMeme])

  const selectMeme = (meme) => {
    setSelectedMeme(meme)
    setVideos([])
    setVideosError(null)
    setVideosLoading(true)
    getMemeVideos(meme.term)
      .then((res) => setVideos(res || []))
      .catch((e) => setVideosError(e.message || '관련 영상을 불러오지 못했습니다.'))
      .finally(() => setVideosLoading(false))
  }

  const openVideoDialog = (v) => setVideoDialog({ videoId: v.videoId, title: v.title || '영상' })
  const closeVideoDialog = () => setVideoDialog(null)

  return (
    <div className="app">
      <header className="header">
        <h1>최신 밈</h1>
        <p className="sub">Giphy 실시간 트렌딩 기준 인기 밈 20가지를 보여드려요.</p>
      </header>

      <section className="result-section">
        <h2 className="section-title">최신 밈 20가지</h2>
        {memesLoading && (
          <p className="empty result-loading"><span className="spinner-inline" /> 불러오는 중…</p>
        )}
        {!memesLoading && memesError && (
          <p className="youtube-error-reason">{memesError}</p>
        )}
        {!memesLoading && !memesError && memes.length === 0 && (
          <p className="empty">
            정식 API(Giphy)가 설정되지 않아 밈 목록을 표시하지 않았습니다. API 키를 먼저 설정해 주세요.
          </p>
        )}
        {!memesLoading && memes.length > 0 && (
          <div className="recipe-grid recipe-grid--grid3">
            {memes.map((m) => (
              <article
                key={m.term}
                role="button"
                tabIndex={0}
                className={`recipe-card card meme-card ${selectedMeme?.term === m.term ? 'selected' : ''}`}
                onClick={() => selectMeme(m)}
                onKeyDown={(e) => e.key === 'Enter' && selectMeme(m)}
              >
                {m.thumbnailUrl && (
                  <div className="card-image-placeholder">
                    <img src={m.thumbnailUrl} alt="" loading="lazy" />
                  </div>
                )}
                <div className="card-body">
                  <h3 className="card-title">#{m.rank} {m.term}</h3>
                  {m.description && <p className="card-desc">{m.description}</p>}
                  <p className="card-hint">클릭하면 관련 인기 영상 보기</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedMeme && (
        <section className="result-section meme-video-section" ref={videoSectionRef}>
          <div className="recommend-group">
            <h3 className="recommend-subtitle">'{selectedMeme.term}' 관련 인기 영상</h3>
            {videosLoading && (
              <p className="empty result-loading"><span className="spinner-inline" /> 영상 불러오는 중…</p>
            )}
            {!videosLoading && videosError && (
              <p className="youtube-error-reason">{videosError}</p>
            )}
            {!videosLoading && !videosError && videos.length === 0 && (
              <p className="empty">관련 영상을 찾지 못했습니다.</p>
            )}
            {!videosLoading && videos.length > 0 && (
              <div className="recipe-grid recipe-grid--grid3">
                {videos.map((v) => (
                  <article
                    key={v.videoId}
                    role="button"
                    tabIndex={0}
                    className="recipe-card card youtube-card"
                    onClick={() => openVideoDialog(v)}
                    onKeyDown={(e) => e.key === 'Enter' && openVideoDialog(v)}
                  >
                    <div className="card-image-placeholder">
                      <img src={`https://img.youtube.com/vi/${v.videoId}/sddefault.jpg`} alt="" loading="lazy" />
                    </div>
                    <div className="card-body">
                      <h3 className="card-title">{v.title || '영상 보기'}</h3>
                      <p className="card-hint">클릭하면 영상 재생</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {videoDialog && (
        <div className="modal-backdrop" onClick={closeVideoDialog} role="presentation">
          <div className="modal card youtube-recipe-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeVideoDialog} aria-label="닫기">×</button>
            <h2 className="modal-title">{videoDialog.title}</h2>
            <div className="youtube-wrap">
              <iframe
                title={videoDialog.title}
                src={`https://www.youtube.com/embed/${videoDialog.videoId}`}
                className="youtube-embed"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
