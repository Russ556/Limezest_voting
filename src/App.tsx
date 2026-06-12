import { useMemo, useState } from 'react'
import './App.css'

type Role = 'host' | 'guest'
type Phase = 'landing' | 'nickname' | 'lobby' | 'room'
type RoomStatus = 'waiting' | 'voting' | 'closed' | 'result'
type VoteMode = 'single' | 'multi' | 'score'
type RevealMode = 'instant' | 'countdown' | 'manual'

type Hobby = {
  id: number
  title: string
  desc: string
  author: string
  votes: number
  voterNames: string[]
}

const initialHobbies: Hobby[] = [
  {
    id: 1,
    title: '밤 산책 사진 모으기',
    desc: '퇴근 후 30분만 걸으면서 오늘의 예쁜 불빛을 찍어요. 돈 안 들고 대화 주제도 바로 생겨요.',
    author: '민지',
    votes: 5,
    voterNames: ['도윤', '서아', '유진', '하린', '지후'],
  },
  {
    id: 2,
    title: '향 없는 차 마시기',
    desc: '카페인 부담 없이 따뜻한 잔으로 하루를 닫는 취미예요. 같이 마시면 취향 얘기가 술술 나와요.',
    author: '태오',
    votes: 3,
    voterNames: ['민지', '서준', '가온'],
  },
  {
    id: 3,
    title: '동네 빵집 지도 만들기',
    desc: '주말마다 작은 빵집 하나씩 탐험해요. 맛있는 발견을 서로 공유하는 재미가 커요.',
    author: '서아',
    votes: 7,
    voterNames: ['민지', '태오', '도윤', '유진', '하린', '지후', '가온'],
  },
]

const mockRooms = [
  { id: 'room-1', name: '금요일 취미 영업회', host: '김학종', members: 8, isPrivate: false, status: '대기중' },
  { id: 'room-2', name: '우리 반 취미 공유', host: '아라', members: 5, isPrivate: true, status: '투표중' },
  { id: 'room-3', name: '소소한 취미 추천방', host: '파피루스', members: 12, isPrivate: false, status: '대기중' },
]

function App() {
  const [phase, setPhase] = useState<Phase>('landing')
  const [role, setRole] = useState<Role>('host')
  const [nickname, setNickname] = useState('')
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting')
  const [voteMode, setVoteMode] = useState<VoteMode>('single')
  const [revealMode, setRevealMode] = useState<RevealMode>('countdown')
  const [roomPrivate, setRoomPrivate] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteRoom, setShowDeleteRoom] = useState(false)
  const [showNames, setShowNames] = useState(false)
  const [selectedVote, setSelectedVote] = useState<number | null>(null)
  const [hobbyName, setHobbyName] = useState('')
  const [hobbyDesc, setHobbyDesc] = useState('')
  const [hobbies, setHobbies] = useState(initialHobbies)

  const displayName = nickname.trim() || (role === 'host' ? '호스트' : '참여자')
  const participants = useMemo(() => ['김학종', '민지', '태오', '서아', displayName, '도윤', '유진'], [displayName])
  const totalVotes = hobbies.reduce((sum, hobby) => sum + hobby.votes, 0) + (selectedVote ? 1 : 0)

  const enterWithRole = (nextRole: Role) => {
    setRole(nextRole)
    setPhase('nickname')
  }

  const completeNickname = () => {
    if (!nickname.trim()) return
    setPhase('lobby')
  }

  const enterRoom = () => {
    setShowCreate(false)
    setPhase('room')
  }

  const addHobby = () => {
    if (!hobbyName.trim() || !hobbyDesc.trim()) return
    setHobbies((items) => [
      ...items,
      {
        id: Date.now(),
        title: hobbyName.trim(),
        desc: hobbyDesc.trim(),
        author: displayName,
        votes: 0,
        voterNames: [],
      },
    ])
    setHobbyName('')
    setHobbyDesc('')
  }

  const deleteRoom = () => {
    setShowDeleteRoom(false)
    setShowSettings(false)
    setShowNames(false)
    setSelectedVote(null)
    setRoomStatus('waiting')
    setHobbies(initialHobbies)
    setPhase('lobby')
  }

  const statusCopy = {
    waiting: '소재 모집 중',
    voting: '투표 진행 중',
    closed: '투표 종료',
    result: '결과 공개',
  }[roomStatus]

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button className="brand" onClick={() => setPhase('landing')}>
          <span className="brand-mark">LZ</span>
          <span>
            <strong>LIMEZEST</strong>
            <small>취미 영업소</small>
          </span>
        </button>
        <div className="topbar-actions">
          <span className="limezest-wordmark">LIMEZEST</span>
          <button className="ghost-button" onClick={() => setShowAdmin(true)}>관리자</button>
        </div>
      </header>

      {phase === 'landing' && (
        <section className="hero-grid page-card">
          <div className="hero-copy">
            <span className="eyebrow">Hobby Pitch Room</span>
            <h1>오늘의 취미를<br />가볍게 영업해볼까요?</h1>
            <p>
              방을 만들고, 각자의 소소한 취미를 카드로 추가한 뒤 투표로 함께 해보고 싶은 취미를 골라요.
            </p>
            <div className="role-actions">
              <button className="role-card host" onClick={() => enterWithRole('host')}>
                <span>방 열기</span>
                <strong>호스트로 입장</strong>
                <small>방 생성 · 설정 · 투표 시작</small>
              </button>
              <button className="role-card guest" onClick={() => enterWithRole('guest')}>
                <span>참여하기</span>
                <strong>참여자로 입장</strong>
                <small>공개방 입장 · 소재 추가 · 투표</small>
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-label="취미 영업소 미리보기">
            <div className="hero-image-card">
              <img
                src="/assets/hobby-hero.svg"
                alt="취미 피켓을 든 LIMEZEST 캐릭터"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <div className="hero-image-fallback">
                <span>HOBBY</span>
                <strong>취미를 영업하는<br />LIMEZEST 캐릭터</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === 'nickname' && (
        <section className="center-card page-card narrow">
          <span className="eyebrow">{role === 'host' ? 'Host Entrance' : 'Guest Entrance'}</span>
          <h2>{role === 'host' ? '방을 열 이름을 알려줘요' : '참여할 닉네임을 정해요'}</h2>
          <p>방 안에서 참여자 목록과 취미 카드 작성자에 표시됩니다.</p>
          <label className="input-label">
            닉네임
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 학종" maxLength={12} />
          </label>
          <div className="button-row">
            <button className="secondary-button" onClick={() => setPhase('landing')}>뒤로</button>
            <button className="primary-button" onClick={completeNickname}>다음</button>
          </div>
        </section>
      )}

      {phase === 'lobby' && (
        <section className="lobby-grid">
          <div className="page-card lobby-intro">
            <span className="eyebrow">Lobby</span>
            <h2>{displayName}님, {role === 'host' ? '새 영업방을 만들어볼까요?' : '참여할 방을 골라볼까요?'}</h2>
            <p>공개방은 바로 입장하고, 비공개방은 비밀번호 확인 후 입장하는 흐름으로 설계합니다.</p>
            {role === 'host' ? (
              <button className="primary-button wide" onClick={() => setShowCreate(true)}>방 만들기</button>
            ) : (
              <button className="secondary-button wide" onClick={() => enterRoom()}>추천 공개방 바로 입장</button>
            )}
          </div>
          <div className="room-list page-card">
            <div className="section-head">
              <h3>참여 가능한 방</h3>
              <span>실시간 목록</span>
            </div>
            {mockRooms.map((room) => (
              <button className="room-row" key={room.id} onClick={enterRoom}>
                <span className="room-icon">{room.isPrivate ? '🔒' : '🌿'}</span>
                <span className="room-main">
                  <strong>{room.name}</strong>
                  <small>호스트 {room.host} · {room.members}명 · {room.status}</small>
                </span>
                <span className="enter-chip">입장</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'room' && (
        <section className="room-layout">
          <div className="room-main-panel page-card">
            <div className="room-header">
              <div>
                <span className="eyebrow">{statusCopy}</span>
                <h2>금요일 취미 영업회</h2>
              </div>
              <div className="room-tools">
                {role === 'host' && <button className="ghost-button" onClick={() => setShowSettings(true)}>방 설정</button>}
                {role === 'host' && <button className="danger-button" onClick={() => setShowDeleteRoom(true)}>방 삭제</button>}
                {role === 'host' && <button className="danger-button" onClick={() => setPhase('lobby')}>퇴장</button>}
              </div>
            </div>

            <div className="status-strip">
              <span>투표 방식: {voteMode === 'single' ? '1인 1표' : voteMode === 'multi' ? '복수 선택' : '점수 투표'}</span>
              <span>{roomPrivate ? '비공개방' : '공개방'}</span>
              <span>투표 인원 {totalVotes}명</span>
            </div>

            {roomStatus === 'closed' && (
              <div className="closed-banner">
                <strong>투표가 종료됐습니다</strong>
                <p>호스트가 결과 보기를 누르면 공개 방식에 따라 결과가 표시됩니다.</p>
              </div>
            )}

            {roomStatus === 'result' && revealMode === 'countdown' && (
              <div className="countdown-card">
                <span>5</span>
                <p>초 뒤 결과 공개 액션 예시</p>
              </div>
            )}

            <div className="add-hobby-card">
              <div>
                <h3>취미 소재 추가</h3>
                <p>취미 이름과 2~3줄 소개를 입력하면 카드로 쌓입니다.</p>
              </div>
              <div className="hobby-form">
                <input value={hobbyName} onChange={(e) => setHobbyName(e.target.value)} placeholder="취미 이름" />
                <textarea value={hobbyDesc} onChange={(e) => setHobbyDesc(e.target.value)} placeholder="2~3줄 소개를 적어주세요" rows={3} />
                <button className="primary-button" onClick={addHobby}>소재 추가</button>
              </div>
            </div>

            <div className="hobby-grid">
              {hobbies.map((hobby) => {
                const selected = selectedVote === hobby.id
                return (
                  <article className={`hobby-card ${selected ? 'selected' : ''}`} key={hobby.id}>
                    <div className="hobby-topline">
                      <span>{hobby.author}</span>
                      {roomStatus === 'result' && <b>{hobby.votes + (selected ? 1 : 0)}표</b>}
                    </div>
                    <h3>{hobby.title}</h3>
                    <p>{hobby.desc}</p>
                    {roomStatus === 'voting' && (
                      <button className="vote-button" onClick={() => setSelectedVote(hobby.id)}>
                        {selected ? '선택 완료' : '이 취미에 투표'}
                      </button>
                    )}
                    {roomStatus === 'result' && showNames && (
                      <small className="voters">투표자: {[...hobby.voterNames, ...(selected ? [displayName] : [])].join(', ') || '아직 없음'}</small>
                    )}
                  </article>
                )
              })}
            </div>

            <div className="bottom-actions">
              {roomStatus === 'waiting' && role === 'host' && <button className="primary-button" onClick={() => setRoomStatus('voting')}>투표 시작</button>}
              {roomStatus === 'voting' && role === 'host' && <button className="primary-button" onClick={() => setRoomStatus('closed')}>투표 종료</button>}
              {roomStatus === 'closed' && role === 'host' && <button className="primary-button" onClick={() => setRoomStatus('result')}>결과 보기</button>}
              {roomStatus === 'result' && role === 'host' && <button className="secondary-button" onClick={() => setShowNames((v) => !v)}>{showNames ? '투표자 숨기기' : '누가 어디에 투표했는지 공개하기'}</button>}
            </div>
          </div>

          <aside className="participant-panel page-card">
            <div className="section-head">
              <h3>참여자</h3>
              <span>{participants.length}명</span>
            </div>
            <div className="participant-list">
              {participants.map((person, index) => (
                <div className="participant" key={`${person}-${index}`}>
                  <span>{person.slice(0, 1)}</span>
                  <strong>{person}</strong>
                  {index === 0 && <small>호스트</small>}
                </div>
              ))}
            </div>
          </aside>
        </section>
      )}

      {showCreate && (
        <Modal title="방 만들기" onClose={() => setShowCreate(false)}>
          <label className="input-label">방 이름<input defaultValue="금요일 취미 영업회" /></label>
          <div className="toggle-row">
            <button className={!roomPrivate ? 'toggle active' : 'toggle'} onClick={() => setRoomPrivate(false)}>공개</button>
            <button className={roomPrivate ? 'toggle active' : 'toggle'} onClick={() => setRoomPrivate(true)}>비공개</button>
          </div>
          {roomPrivate && <label className="input-label">비밀번호<input type="password" placeholder="비밀번호 입력" /></label>}
          <SettingsFields voteMode={voteMode} setVoteMode={setVoteMode} revealMode={revealMode} setRevealMode={setRevealMode} />
          <button className="primary-button wide" onClick={enterRoom}>방 생성하고 입장</button>
        </Modal>
      )}

      {showSettings && (
        <Modal title="방 설정" onClose={() => setShowSettings(false)}>
          <p className="modal-copy">투표 시작 전까지만 투표 방식을 수정할 수 있습니다.</p>
          <SettingsFields voteMode={voteMode} setVoteMode={setVoteMode} revealMode={revealMode} setRevealMode={setRevealMode} disabled={roomStatus !== 'waiting'} />
          <button className="primary-button wide" onClick={() => setShowSettings(false)}>저장</button>
        </Modal>
      )}

      {showDeleteRoom && (
        <Modal title="방 삭제" onClose={() => setShowDeleteRoom(false)}>
          <div className="warning-card">
            <strong>이 방을 삭제할까요?</strong>
            <p>삭제하면 방 목록에서 사라지고, 참여자·취미 소재·투표 데이터도 함께 정리되는 흐름으로 연결됩니다.</p>
          </div>
          <div className="button-row split-actions">
            <button className="secondary-button" onClick={() => setShowDeleteRoom(false)}>취소</button>
            <button className="danger-button" onClick={deleteRoom}>방 삭제하기</button>
          </div>
        </Modal>
      )}

      {showAdmin && (
        <Modal title="관리자 접속" onClose={() => setShowAdmin(false)}>
          <p className="modal-copy">계정 예시나 자동완성 문구는 노출하지 않는 화면입니다.</p>
          <label className="input-label">계정<input autoComplete="off" /></label>
          <label className="input-label">비밀번호<input type="password" autoComplete="new-password" /></label>
          <button className="primary-button wide" onClick={() => setShowAdmin(false)}>관리자 로그인</button>
        </Modal>
      )}
    </main>
  )
}

function SettingsFields({ voteMode, setVoteMode, revealMode, setRevealMode, disabled = false }: {
  voteMode: VoteMode
  setVoteMode: (mode: VoteMode) => void
  revealMode: RevealMode
  setRevealMode: (mode: RevealMode) => void
  disabled?: boolean
}) {
  return (
    <div className="settings-stack">
      <div>
        <strong>투표 방식</strong>
        <div className="toggle-row">
          <button disabled={disabled} className={voteMode === 'single' ? 'toggle active' : 'toggle'} onClick={() => setVoteMode('single')}>1인 1표</button>
          <button disabled={disabled} className={voteMode === 'multi' ? 'toggle active' : 'toggle'} onClick={() => setVoteMode('multi')}>복수 선택</button>
          <button disabled={disabled} className={voteMode === 'score' ? 'toggle active' : 'toggle'} onClick={() => setVoteMode('score')}>점수 투표</button>
        </div>
      </div>
      <div>
        <strong>결과 공개 방식</strong>
        <div className="toggle-row">
          <button className={revealMode === 'instant' ? 'toggle active' : 'toggle'} onClick={() => setRevealMode('instant')}>바로 공개</button>
          <button className={revealMode === 'countdown' ? 'toggle active' : 'toggle'} onClick={() => setRevealMode('countdown')}>5초 카운트</button>
          <button className={revealMode === 'manual' ? 'toggle active' : 'toggle'} onClick={() => setRevealMode('manual')}>일부 공개</button>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default App
