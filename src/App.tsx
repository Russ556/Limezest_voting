import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

type Role = 'host' | 'guest'
type Phase = 'landing' | 'nickname' | 'lobby' | 'room'
type RoomStatus = 'waiting' | 'voting' | 'closed' | 'result'
type VoteMode = 'single' | 'multi' | 'score'
type RevealMode = 'instant' | 'countdown' | 'manual'

type Room = {
  id: string
  name: string
  host_nickname: string
  is_private: boolean
  password_hash: string | null
  vote_mode: VoteMode
  reveal_mode: RevealMode
  status: RoomStatus
  show_voter_names: boolean
  created_at: string
}

type Participant = {
  id: string
  room_id: string
  nickname: string
  role: Role
  joined_at: string
}

type Hobby = {
  id: string
  room_id: string
  author_participant_id: string | null
  title: string
  description: string
  created_at: string
}

type Vote = {
  id: string
  room_id: string
  hobby_id: string
  participant_id: string
  score: number | null
}

const ADMIN_ID = 'arasd123'
const ADMIN_PASSWORD = 'arasd123'

function App() {
  const [phase, setPhase] = useState<Phase>('landing')
  const [role, setRole] = useState<Role>('host')
  const [nickname, setNickname] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [hobbies, setHobbies] = useState<Hobby[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null)
  const [voteMode, setVoteMode] = useState<VoteMode>('single')
  const [revealMode, setRevealMode] = useState<RevealMode>('countdown')
  const [roomPrivate, setRoomPrivate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoggedIn, setAdminLoggedIn] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteRoom, setShowDeleteRoom] = useState(false)
  const [selectedVote, setSelectedVote] = useState<string | null>(null)
  const [hobbyName, setHobbyName] = useState('')
  const [hobbyDesc, setHobbyDesc] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const displayName = nickname.trim() || (role === 'host' ? '호스트' : '참여자')
  const currentRoom = useMemo(() => rooms.find((room) => room.id === currentRoomId) || null, [rooms, currentRoomId])
  const currentParticipants = useMemo(
    () => participants.filter((participant) => participant.room_id === currentRoomId),
    [participants, currentRoomId],
  )
  const currentHobbies = useMemo(
    () => hobbies.filter((hobby) => hobby.room_id === currentRoomId),
    [hobbies, currentRoomId],
  )
  const roomVotes = useMemo(() => votes.filter((vote) => vote.room_id === currentRoomId), [votes, currentRoomId])
  const roomsWithCounts = useMemo(
    () => rooms.map((room) => ({ ...room, memberCount: participants.filter((participant) => participant.room_id === room.id).length })),
    [rooms, participants],
  )
  const myVote = useMemo(
    () => roomVotes.find((vote) => vote.participant_id === currentParticipantId) || null,
    [roomVotes, currentParticipantId],
  )
  const totalVotes = new Set(roomVotes.map((vote) => vote.participant_id)).size

  const statusCopy = {
    waiting: '소재 모집 중',
    voting: '투표 진행 중',
    closed: '투표 종료',
    result: '결과 공개',
  }[currentRoom?.status || 'waiting']

  const fetchAll = async () => {
    const [roomResult, participantResult, hobbyResult, voteResult] = await Promise.all([
      supabase.from('rooms').select('*').order('created_at', { ascending: false }),
      supabase.from('participants').select('*').order('joined_at', { ascending: true }),
      supabase.from('hobbies').select('*').order('created_at', { ascending: true }),
      supabase.from('votes').select('*'),
    ])

    if (roomResult.error || participantResult.error || hobbyResult.error || voteResult.error) {
      setNotice('Supabase 데이터를 불러오지 못했습니다. 환경변수와 RLS 설정을 확인해주세요.')
      return
    }

    setRooms((roomResult.data || []) as Room[])
    setParticipants((participantResult.data || []) as Participant[])
    setHobbies((hobbyResult.data || []) as Hobby[])
    setVotes((voteResult.data || []) as Vote[])
  }

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('limezest-live-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hobbies' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (currentRoomId && !rooms.some((room) => room.id === currentRoomId)) {
      setCurrentRoomId(null)
      setCurrentParticipantId(null)
      setSelectedVote(null)
      setShowDeleteRoom(false)
      setPhase('lobby')
      setNotice('방이 삭제되어 로비로 이동했습니다.')
    }
  }, [rooms, currentRoomId])

  const enterWithRole = (nextRole: Role) => {
    setRole(nextRole)
    setNotice('')
    setPhase('nickname')
  }

  const completeNickname = () => {
    if (!nickname.trim()) return
    setPhase('lobby')
  }

  const createRoom = async () => {
    if (!roomName.trim()) {
      setNotice('방 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: roomName.trim(),
        host_nickname: displayName,
        is_private: roomPrivate,
        password_hash: roomPrivate ? roomPassword : null,
        vote_mode: voteMode,
        reveal_mode: revealMode,
        status: 'waiting',
      })
      .select()
      .single()

    if (roomError || !room) {
      setLoading(false)
      setNotice('방 생성에 실패했습니다.')
      return
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({ room_id: room.id, nickname: displayName, role: 'host' })
      .select()
      .single()

    setLoading(false)

    if (participantError || !participant) {
      setNotice('호스트 입장 처리에 실패했습니다.')
      return
    }

    setCurrentRoomId(room.id)
    setCurrentParticipantId(participant.id)
    setRoomName('')
    setRoomPassword('')
    setShowCreate(false)
    setPhase('room')
    await fetchAll()
  }

  const enterRoom = async (roomId: string) => {
    const targetRoom = rooms.find((room) => room.id === roomId)
    if (!targetRoom) return

    setLoading(true)
    const { data: participant, error } = await supabase
      .from('participants')
      .insert({ room_id: roomId, nickname: displayName, role })
      .select()
      .single()
    setLoading(false)

    if (error || !participant) {
      setNotice('방 입장에 실패했습니다.')
      return
    }

    setCurrentRoomId(roomId)
    setCurrentParticipantId(participant.id)
    setVoteMode(targetRoom.vote_mode)
    setRevealMode(targetRoom.reveal_mode)
    setRoomPrivate(targetRoom.is_private)
    setSelectedVote(null)
    setPhase('room')
    await fetchAll()
  }

  const leaveRoom = async () => {
    if (currentParticipantId) {
      await supabase.from('participants').delete().eq('id', currentParticipantId)
    }
    setCurrentRoomId(null)
    setCurrentParticipantId(null)
    setSelectedVote(null)
    setPhase('lobby')
    await fetchAll()
  }

  const addHobby = async () => {
    if (!currentRoomId || !hobbyName.trim() || !hobbyDesc.trim()) return

    const { error } = await supabase.from('hobbies').insert({
      room_id: currentRoomId,
      author_participant_id: currentParticipantId,
      title: hobbyName.trim(),
      description: hobbyDesc.trim(),
    })

    if (error) {
      setNotice('소재 추가에 실패했습니다.')
      return
    }

    setHobbyName('')
    setHobbyDesc('')
    await fetchAll()
  }

  const updateRoom = async (updates: Partial<Room>) => {
    if (!currentRoomId) return
    const { error } = await supabase.from('rooms').update(updates).eq('id', currentRoomId)
    if (error) {
      setNotice('방 상태 변경에 실패했습니다.')
      return
    }
    await fetchAll()
  }

  const voteForHobby = async (hobbyId: string) => {
    if (!currentRoomId || !currentParticipantId || currentRoom?.status !== 'voting') return

    if (myVote) {
      const { error } = await supabase.from('votes').update({ hobby_id: hobbyId }).eq('id', myVote.id)
      if (error) setNotice('투표 변경에 실패했습니다.')
    } else {
      const { error } = await supabase.from('votes').insert({
        room_id: currentRoomId,
        hobby_id: hobbyId,
        participant_id: currentParticipantId,
        score: voteMode === 'score' ? 5 : null,
      })
      if (error) setNotice('투표에 실패했습니다.')
    }

    setSelectedVote(hobbyId)
    await fetchAll()
  }

  const deleteRoom = async (roomId = currentRoomId) => {
    if (!roomId) return

    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (error) {
      setNotice('방 삭제에 실패했습니다.')
      return
    }

    if (roomId === currentRoomId) {
      setCurrentRoomId(null)
      setCurrentParticipantId(null)
      setSelectedVote(null)
      setShowDeleteRoom(false)
      setShowSettings(false)
      setPhase('lobby')
    }

    await fetchAll()
  }

  const submitAdminLogin = () => {
    if (adminId === ADMIN_ID && adminPassword === ADMIN_PASSWORD) {
      setAdminLoggedIn(true)
      setAdminError('')
      setAdminPassword('')
      return
    }
    setAdminError('아이디 or 비밀번호가 틀렸습니다.')
  }

  const getVoteCount = (hobbyId: string) => votes.filter((vote) => vote.hobby_id === hobbyId).length
  const getVoterNames = (hobbyId: string) =>
    votes
      .filter((vote) => vote.hobby_id === hobbyId)
      .map((vote) => participants.find((participant) => participant.id === vote.participant_id)?.nickname)
      .filter(Boolean)
      .join(', ')

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

      {notice && <div className="notice-banner">{notice}</div>}

      {phase === 'landing' && (
        <section className="hero-grid page-card">
          <div className="hero-copy">
            <span className="eyebrow">Hobby Pitch Room</span>
            <h1>오늘의 취미를<br />가볍게 영업해볼까요?</h1>
            <p>방을 만들고, 각자의 소소한 취미를 카드로 추가한 뒤 투표로 함께 해보고 싶은 취미를 골라요.</p>
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
              <img src="/assets/hobby-hero.svg" alt="취미 피켓을 든 LIMEZEST 캐릭터" onError={(event) => { event.currentTarget.style.display = 'none' }} />
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
            <p>목록은 Supabase 실시간 데이터만 표시합니다. 만든 방이 없으면 빈 상태로 보입니다.</p>
            {role === 'host' && <button className="primary-button wide" onClick={() => setShowCreate(true)}>방 만들기</button>}
          </div>
          <div className="room-list page-card">
            <div className="section-head">
              <h3>참여 가능한 방</h3>
              <span>실시간 목록</span>
            </div>
            {roomsWithCounts.length === 0 ? (
              <EmptyState title="아직 만들어진 방이 없습니다" copy={role === 'host' ? '방 만들기를 눌러 첫 방을 만들어주세요.' : '호스트가 방을 만들면 여기에 실시간으로 표시됩니다.'} />
            ) : (
              roomsWithCounts.map((room) => (
                <button className="room-row" key={room.id} onClick={() => enterRoom(room.id)} disabled={loading}>
                  <span className="room-icon">{room.is_private ? '🔒' : '🌿'}</span>
                  <span className="room-main">
                    <strong>{room.name}</strong>
                    <small>호스트 {room.host_nickname} · {room.memberCount}명 · {room.status === 'waiting' ? '대기중' : room.status === 'voting' ? '투표중' : room.status === 'closed' ? '종료' : '결과공개'}</small>
                  </span>
                  <span className="enter-chip">입장</span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {phase === 'room' && currentRoom && (
        <section className="room-layout">
          <div className="room-main-panel page-card">
            <div className="room-header">
              <div>
                <span className="eyebrow">{statusCopy}</span>
                <h2>{currentRoom.name}</h2>
              </div>
              <div className="room-tools">
                {role === 'host' && <button className="ghost-button" onClick={() => setShowSettings(true)}>방 설정</button>}
                {role === 'host' && <button className="danger-button" onClick={() => setShowDeleteRoom(true)}>방 삭제</button>}
                <button className="danger-button" onClick={leaveRoom}>퇴장</button>
              </div>
            </div>

            <div className="status-strip">
              <span>투표 방식: {currentRoom.vote_mode === 'single' ? '1인 1표' : currentRoom.vote_mode === 'multi' ? '복수 선택' : '점수 투표'}</span>
              <span>{currentRoom.is_private ? '비공개방' : '공개방'}</span>
              <span>투표 인원 {totalVotes}명</span>
            </div>

            {currentRoom.status === 'closed' && (
              <div className="closed-banner">
                <strong>투표가 종료됐습니다</strong>
                <p>호스트가 결과 보기를 누르면 공개 방식에 따라 결과가 표시됩니다.</p>
              </div>
            )}

            {currentRoom.status === 'result' && currentRoom.reveal_mode === 'countdown' && (
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

            {currentHobbies.length === 0 ? (
              <EmptyState title="아직 추가된 소재가 없습니다" copy="호스트나 참여자가 소재를 추가하면 이곳에 카드가 생깁니다." />
            ) : (
              <div className="hobby-grid">
                {currentHobbies.map((hobby) => {
                  const selected = myVote?.hobby_id === hobby.id || selectedVote === hobby.id
                  return (
                    <article className={`hobby-card ${selected ? 'selected' : ''}`} key={hobby.id}>
                      <div className="hobby-topline">
                        <span>{participants.find((participant) => participant.id === hobby.author_participant_id)?.nickname || '익명'}</span>
                        {currentRoom.status === 'result' && <b>{getVoteCount(hobby.id)}표</b>}
                      </div>
                      <h3>{hobby.title}</h3>
                      <p>{hobby.description}</p>
                      {currentRoom.status === 'voting' && (
                        <button className="vote-button" onClick={() => voteForHobby(hobby.id)}>
                          {selected ? '선택 완료' : '이 취미에 투표'}
                        </button>
                      )}
                      {currentRoom.status === 'result' && currentRoom.show_voter_names && (
                        <small className="voters">투표자: {getVoterNames(hobby.id) || '아직 없음'}</small>
                      )}
                    </article>
                  )
                })}
              </div>
            )}

            <div className="bottom-actions">
              {currentRoom.status === 'waiting' && role === 'host' && <button className="primary-button" onClick={() => updateRoom({ status: 'voting' })}>투표 시작</button>}
              {currentRoom.status === 'voting' && role === 'host' && <button className="primary-button" onClick={() => updateRoom({ status: 'closed' })}>투표 종료</button>}
              {currentRoom.status === 'closed' && role === 'host' && <button className="primary-button" onClick={() => updateRoom({ status: 'result' })}>결과 보기</button>}
              {currentRoom.status === 'result' && role === 'host' && <button className="secondary-button" onClick={() => updateRoom({ show_voter_names: !currentRoom.show_voter_names })}>{currentRoom.show_voter_names ? '투표자 숨기기' : '누가 어디에 투표했는지 공개하기'}</button>}
            </div>
          </div>

          <aside className="participant-panel page-card">
            <div className="section-head">
              <h3>참여자</h3>
              <span>{currentParticipants.length}명</span>
            </div>
            {currentParticipants.length === 0 ? (
              <EmptyState title="참여자가 없습니다" copy="방에 입장한 사람이 없으면 비어 있습니다." compact />
            ) : (
              <div className="participant-list">
                {currentParticipants.map((person) => (
                  <div className="participant" key={person.id}>
                    <span>{person.nickname.slice(0, 1)}</span>
                    <strong>{person.nickname}</strong>
                    {person.role === 'host' && <small>호스트</small>}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </section>
      )}

      {showCreate && (
        <Modal title="방 만들기" onClose={() => setShowCreate(false)}>
          <label className="input-label">방 이름<input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="방 이름 입력" /></label>
          <div className="toggle-row">
            <button className={!roomPrivate ? 'toggle active' : 'toggle'} onClick={() => setRoomPrivate(false)}>공개</button>
            <button className={roomPrivate ? 'toggle active' : 'toggle'} onClick={() => setRoomPrivate(true)}>비공개</button>
          </div>
          {roomPrivate && <label className="input-label">비밀번호<input type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="비밀번호 입력" /></label>}
          <SettingsFields voteMode={voteMode} setVoteMode={setVoteMode} revealMode={revealMode} setRevealMode={setRevealMode} />
          <button className="primary-button wide" onClick={createRoom} disabled={loading}>{loading ? '생성 중...' : '방 생성하고 입장'}</button>
        </Modal>
      )}

      {showSettings && currentRoom && (
        <Modal title="방 설정" onClose={() => setShowSettings(false)}>
          <p className="modal-copy">투표 시작 전까지만 투표 방식을 수정할 수 있습니다.</p>
          <SettingsFields voteMode={currentRoom.vote_mode} setVoteMode={(mode) => updateRoom({ vote_mode: mode })} revealMode={currentRoom.reveal_mode} setRevealMode={(mode) => updateRoom({ reveal_mode: mode })} disabled={currentRoom.status !== 'waiting'} />
          <button className="primary-button wide" onClick={() => setShowSettings(false)}>저장</button>
        </Modal>
      )}

      {showDeleteRoom && (
        <Modal title="방 삭제" onClose={() => setShowDeleteRoom(false)}>
          <div className="warning-card">
            <strong>이 방을 삭제할까요?</strong>
            <p>삭제하면 방 목록에서 사라지고, 참여자·취미 소재·투표 데이터도 함께 삭제됩니다.</p>
          </div>
          <div className="button-row split-actions">
            <button className="secondary-button" onClick={() => setShowDeleteRoom(false)}>취소</button>
            <button className="danger-button" onClick={() => deleteRoom()}>방 삭제하기</button>
          </div>
        </Modal>
      )}

      {showAdmin && (
        <Modal title="관리자 접속" onClose={() => setShowAdmin(false)}>
          {!adminLoggedIn ? (
            <>
              <p className="modal-copy">관리자 계정으로 로그인하면 전체 방을 관리할 수 있습니다.</p>
              <label className="input-label">계정<input value={adminId} onChange={(e) => setAdminId(e.target.value)} autoComplete="off" /></label>
              <label className="input-label">비밀번호<input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} type="password" autoComplete="new-password" /></label>
              {adminError && <p className="form-error">{adminError}</p>}
              <button className="primary-button wide" onClick={submitAdminLogin}>관리자 로그인</button>
            </>
          ) : (
            <div className="admin-panel">
              <p className="modal-copy">관리자 로그인 완료. 전체 방을 삭제할 수 있습니다.</p>
              {rooms.length === 0 ? (
                <EmptyState title="관리할 방이 없습니다" copy="현재 생성된 방이 없습니다." compact />
              ) : (
                rooms.map((room) => (
                  <div className="admin-room-row" key={room.id}>
                    <span>
                      <strong>{room.name}</strong>
                      <small>호스트 {room.host_nickname}</small>
                    </span>
                    <button className="danger-button" onClick={() => deleteRoom(room.id)}>삭제</button>
                  </div>
                ))
              )}
              <button className="secondary-button wide" onClick={() => setAdminLoggedIn(false)}>로그아웃</button>
            </div>
          )}
        </Modal>
      )}
    </main>
  )
}

function EmptyState({ title, copy, compact = false }: { title: string; copy: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
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
