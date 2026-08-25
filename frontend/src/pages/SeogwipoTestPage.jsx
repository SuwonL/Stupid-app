import './SeogwipoTestPage.css'

// 업로드받은 독립 실행형 HTML(자체 CSS/JS 내장, 외부 이미지 없이 base64로 전부 포함)을
// public/tests/에 그대로 두고 iframe으로 띄운다. 이 페이지 CSS(:root 변수, body 배경 등)를
// React 앱의 전역 스타일과 그대로 합치면 서로 :root, body, .card 같은 이름이 겹쳐 깨질 수 있어서,
// iframe으로 완전히 분리된 문서로 격리하는 게 가장 안전하다.
export default function SeogwipoTestPage() {
  return (
    <div className="seogwipo-test-page">
      <iframe
        src="/tests/seogwipo-90-quiz.html"
        title="90년생 서귀포시민 인증 테스트"
        className="seogwipo-test-frame"
        allow="clipboard-write"
      />
    </div>
  )
}
