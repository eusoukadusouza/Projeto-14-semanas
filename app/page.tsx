'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/* =========================
   SEMANAS PROFÉTICAS
========================= */
const SEMANAS = [
  'Jeconias',
  'Salatiel',
  'Zorobabel',
  'Abiúde',
  'Eliaquim',
  'Azor',
  'Sadoque',
  'Aquim',
  'Eliúde',
  'Eleazar',
  'Matã',
  'Jacó',
  'José',
  'Jesus',
]

/* =========================
   HÁBITOS SUGERIDOS
========================= */
const HABITOS_SUGERIDOS = [
  {
    name: 'Leitura diária',
    metric_type: 'minutes',
    target_numeric: null, // será preenchido dinamicamente com daysRemaining
    frequency: 'daily',
    description: 'Leitura diária desenvolve clareza, sabedoria e visão de longo prazo.',
    pillar: 'Conhecimento',
  },
  {
    name: 'Treino físico',
    metric_type: 'minutes',
    target_numeric: null, // será preenchido dinamicamente com daysRemaining
    frequency: 'daily',
    description: 'Disciplina física fortalece corpo, mente e constância.',
    pillar: 'Saúde',
  },
  {
    name: 'Oração',
    metric_type: 'minutes',
    target_numeric: null, // será preenchido dinamicamente com daysRemaining
    frequency: 'daily',
    description: 'Tempo de oração aprofunda comunhão e direção espiritual.',
    pillar: 'Espiritualidade',
  },
  {
    name: 'Jejum',
    metric_type: 'check',
    target_numeric: null,
    frequency: 'weekly',
    description: 'Jejum semanal desenvolve domínio próprio e sensibilidade espiritual.',
    pillar: 'Espiritualidade',
  },
  {
    name: 'Trabalho diário',
    metric_type: 'count',
    target_numeric: null, // será preenchido dinamicamente com daysRemaining
    frequency: 'daily',
    description: 'Ação diária no trabalho gera crescimento consistente.',
    pillar: 'Ação',
  },
  {
    name: 'Meta financeira diária',
    metric_type: 'money',
    target_numeric: null, // será preenchido dinamicamente com daysRemaining
    frequency: 'daily',
    description: 'Planejamento financeiro orienta decisões e prosperidade.',
    pillar: 'Abundância',
  },
]

/* =========================
   FUNÇÕES DE DATA
========================= */
const getSunday = (date: Date) => {
  const d = new Date(date)
  const diff = d.getDate() - d.getDay()
  return new Date(d.setDate(diff))
}

const getSemanaIndex = (userStartDate: string, date: Date, durationDays = 95) => {
  // Parse date string (YYYY-MM-DD) to avoid timezone issues
  const [startYear, startMonth, startDay] = userStartDate.split('-').map(Number)
  const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
  // Encontra o domingo da semana inicial
  const firstSunday = new Date(start)
  firstSunday.setDate(start.getDate() - start.getDay())
  // Calcula dias desde o primeiro domingo
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const diffMs = current.getTime() - firstSunday.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  // Cada semana tem 7 dias
  const weekIndex = Math.floor(diffDays / 7)
  const maxWeeks = Math.ceil(durationDays / 7) - 1
  return Math.min(maxWeeks, Math.max(0, weekIndex))
}

/* =========================
   COMPONENTE
========================= */
export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [habit, setHabit] = useState<any>(null)
  const [checks, setChecks] = useState<any[]>([])
  const [checkedToday, setCheckedToday] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkingHabitId, setCheckingHabitId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  const getInitials = (user: any) => {
    const name = user?.user_metadata?.full_name || user?.email || ''
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  /* =========================
     9.2.2 — ESTADOS DO HÁBITO PERSONALIZADO
  ========================= */
  const [customName, setCustomName] = useState('')
  const [customMetric, setCustomMetric] = useState('minutes')
  const [customTarget, setCustomTarget] = useState('')
  const [customFrequency, setCustomFrequency] = useState('daily')
  const [userHabits, setUserHabits] = useState<any[]>([])
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [editingTarget, setEditingTarget] = useState<number | string>('')
  /* =========================
     DELETAR HÁBITO
  ========================= */
  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Tem certeza que deseja deletar este hábito?')) return
    try {
      const { error } = await supabase.from('habits').delete().eq('id', habitId)
      if (error) {
        console.error('Erro ao deletar:', error)
        throw error
      }
      setUserHabits((prev) => prev.filter((h) => h.id !== habitId))
      alert('Hábito deletado com sucesso')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert(`Erro ao deletar hábito: ${errorMsg}`)
    }
  }
  /* =========================
     EDITAR TARGET HÁBITO
  ========================= */
  const handleEditTarget = async (habitId: string, newTarget: number) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ target_numeric: newTarget })
        .eq('id', habitId)
      if (error) throw error
      setUserHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, target_numeric: newTarget } : h))
      )
      setEditingHabitId(null)
      setEditingTarget('')
      alert('Meta atualizada com sucesso')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert(`Erro ao atualizar meta: ${errorMsg}`)
    }
  }
  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    const init = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session.session) {
          router.push('/login')
          setLoading(false)
          return
        }
        const user = session.session.user
        setCurrentUser(user)
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!project) {
          const { data: newProject } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: 'Projeto 14 Semanas',
              start_date: '2025-12-14',
              end_date: '2026-03-18',
              user_start_date: '2025-12-14',
              duration_days: 95,
            })
            .select()
            .single()
          setProject(newProject)
          setCurrentUser(user)
          setLoading(false)
          return
        }
        setProject(project)
        console.log('Projeto encontrado:', project.id)
        
        // Carregar todos os hábitos do projeto
        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('*')
          .eq('project_id', project.id)
        
        if (habitsError) {
          console.error('Erro ao buscar hábitos:', habitsError)
        } else {
          console.log('Hábitos carregados:', habits?.length || 0, habits)
          setUserHabits(habits || [])
        }
        
        // Carregar todos os checks
        const { data: checks, error: checksError } = await supabase
          .from('habit_checks')
          .select('habit_id, check_date')
          .eq('user_id', user.id)
        
        if (checksError) {
          console.error('Erro ao buscar checks:', checksError)
        } else {
          console.log('Checks carregados:', checks?.length || 0)
          setChecks(checks || [])
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setLoading(false)
      }
    }
    init()
  }, [router])
  /* =========================
     CHECK DO DIA
  ========================= */
  const handleCheckToday = async () => {
    if (!habit || checkedToday || checking) return
    setChecking(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: session } = await supabase.auth.getSession()
      const user = session.session?.user
      if (!user) throw new Error('Usuário não autenticado')
      // ==== INSERT HERE: evita duplicados ====
      const { data: existingCheck } = await supabase
        .from('habit_checks')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('check_date', today)
        .maybeSingle()
      if (existingCheck) {
        return
      }
      const { error } = await supabase.from('habit_checks').insert({
        habit_id: habit.id,
        user_id: user.id,
        check_date: today,
      })
      if (error) throw error
      setChecks((prev) => [...prev, { check_date: today }])
      setCheckedToday(true)
    } catch (error) {
      console.error('Erro ao fazer check:', error)
      alert('Erro ao registrar check do dia')
    } finally {
      setChecking(false)
    }
  }
  /* =========================
     9.2.2 — CRIAR HÁBITO PERSONALIZADO
  ========================= */
  const handleCreateCustomHabit = async () => {
    if (!customName.trim() || !project) {
      alert('Nome do hábito e projeto são obrigatórios')
      return
    }
    try {
      const { data: session } = await supabase.auth.getSession()
      const user = session.session?.user
      if (!user) {
        alert('Usuário não autenticado')
        return
      }
      const habitData = {
        project_id: project.id,
        user_id: user.id,
        name: customName.trim(),
        metric_type: customMetric || 'minutes',
        target_numeric: customMetric === 'check' ? null : (customTarget ? Number(customTarget) : null),
        frequency: customFrequency || 'daily',
      }
      console.log('Inserindo hábito:', habitData)
      const { data: newHabit, error } = await supabase
        .from('habits')
        .insert([habitData])
        .select()
        .single()
      if (error) {
        console.error('Erro Supabase completo:', error)
        console.error('Status:', error.code)
        console.error('Mensagem:', error.message)
        throw new Error(`Erro Supabase (${error.code}): ${error.message}`)
      }
      if (newHabit) {
        console.log('Hábito criado:', newHabit)
        setUserHabits((prev) => [...prev, newHabit])
      }
      setCustomName('')
      setCustomTarget('')
      setCustomMetric('minutes')
      setCustomFrequency('daily')
      alert('Hábito criado com sucesso!')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao criar hábito:', errorMsg)
      alert(`Erro ao criar hábito: ${errorMsg}`)
    }
  }
  const handleAddSuggestedHabit = async (h: any) => {
    if (!project) {
      alert('Projeto não encontrado')
      return
    }
    try {
      // Verifica duplicação
      const exists = userHabits.some(
        (uh) => uh.name.toLowerCase() === h.name.toLowerCase()
      )
      if (exists) {
        alert('Este hábito já está na sua rotina')
        return
      }
      const { data: session } = await supabase.auth.getSession()
      const user = session.session?.user
      if (!user) {
        alert('Usuário não autenticado')
        return
      }
      const habitData = {
        project_id: project.id,
        user_id: user.id,
        name: h.name,
        metric_type: h.metric_type,
        target_numeric: h.target_numeric,
        frequency: h.frequency,
      }
      console.log('Adicionando hábito sugerido:', habitData)
      const { data, error } = await supabase
        .from('habits')
        .insert([habitData])
        .select()
        .single()
      if (error) {
        console.error('Erro Supabase completo:', error)
        console.error('Status:', error.code)
        console.error('Mensagem:', error.message)
        throw new Error(`Erro Supabase (${error.code}): ${error.message}`)
      }
      if (data) {
        console.log('Hábito sugerido adicionado:', data)
        setUserHabits((prev) => [...prev, data])
        alert(`Hábito "${h.name}" adicionado à sua rotina`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao adicionar hábito:', errorMsg)
      alert(`Erro ao adicionar hábito: ${errorMsg}`)
    }
  }
  const handleCheckHabitToday = async (habitId: string) => {
    if (checkingHabitId) return
    setCheckingHabitId(habitId)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: session } = await supabase.auth.getSession()
      const user = session.session?.user
      if (!user) throw new Error('Usuário não autenticado')
      // evita duplicação: verifica se já existe check hoje para esse hábito
      const { data: existingCheck } = await supabase
        .from('habit_checks')
        .select('id')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .eq('check_date', today)
        .maybeSingle()
      if (existingCheck) {
        return
      }
      const { error } = await supabase.from('habit_checks').insert({
        habit_id: habitId,
        user_id: user.id,
        check_date: today,
      })
      if (error) throw error
      setChecks((prev) => [...prev, { habit_id: habitId, check_date: today }])
      if (habit?.id === habitId) {
        setCheckedToday(true)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao registrar check')
    } finally {
      setCheckingHabitId(null)
    }
  }
  /* =========================
     RENDER
  ========================= */
  if (loading) {
    return <p className="p-8 text-center">Carregando...</p>
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxWeeks = Math.ceil((project?.duration_days || 95) / 7) - 1
  // Use the global project start_date to determine which prophetic week is active
  const projectStart = project?.start_date || project?.user_start_date
  const currentWeek = getSemanaIndex(projectStart, today, project?.duration_days || 95)
  const isFinalWeek = currentWeek === maxWeeks
  const semanaAtiva = SEMANAS[currentWeek]
  // dias restantes no projeto a partir do início do usuário
  let daysRemaining = null
  if (project?.user_start_date && project?.duration_days) {
    const start = new Date(project.user_start_date)
    start.setHours(0, 0, 0, 0)
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    daysRemaining = Math.max(0, project.duration_days - diff)
  }
  const CONTEXTO_SEMANAS = [
  {
    name: 'Jeconias',
    frase: 'Reconhecer limites e encerrar ciclos.',
    acao: 'Aceite o que precisa terminar e não lute contra isso.'
  },
  {
    name: 'Salatiel',
    frase: 'Reconstruir com constância.',
    acao: 'Faça o básico todos os dias, sem ansiedade.'
  },
  {
    name: 'Zorobabel',
    frase: 'Avançar com liderança.',
    acao: 'Assuma responsabilidade pelas suas decisões.'
  },
  {
    name: 'Abiúde',
    frase: 'Fortalecer fundações através da fé.',
    acao: 'Confie no processo e cultive esperança nas dificuldades.'
  },
  {
    name: 'Eliaquim',
    frase: 'Abrir portas e criar oportunidades.',
    acao: 'Busque novas conexões e amplie sua visão.'
  },
  {
    name: 'Azor',
    frase: 'Refinar e purificar seus propósitos.',
    acao: 'Identifique e elimine o que não alinha com seus valores.'
  },
  {
    name: 'Sadoque',
    frase: 'Servir com excelência e integridade.',
    acao: 'Entregue seu melhor em cada ação, por menor que seja.'
  },
  {
    name: 'Aquim',
    frase: 'Preparar o terreno para grandes colheitas.',
    acao: 'Invista em aprendizado e relacionamentos duradouros.'
  },
  {
    name: 'Eliúde',
    frase: 'Reconhecer a presença do divino em tudo.',
    acao: 'Mantenha gratidão e reverência em seu dia a dia.'
  },
  {
    name: 'Eleazar',
    frase: 'Fortalecer a coragem e vencer medos.',
    acao: 'Enfrente um desafio que vinha adiando.'
  },
  {
    name: 'Matã',
    frase: 'Dar e compartilhar abundância.',
    acao: 'Identifique como pode abençoar outras pessoas.'
  },
  {
    name: 'Jacó',
    frase: 'Lutar pela transformação pessoal.',
    acao: 'Permita que suas dores o transformem em força.'
  },
  {
    name: 'José',
    frase: 'Elevar-se através de integridade e visão.',
    acao: 'Mantenha sua ética mesmo sob pressão ou oportunismo.'
  },
  {
    name: 'Jesus',
    frase: 'Completar seu propósito com plenitude.',
    acao: 'Celebre a jornada e prepare-se para o próximo ciclo.'
  },
]
  return (
    <main className="min-h-screen p-6 flex flex-col items-center gap-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white">
      {currentUser && (
        <div className="w-full max-w-md flex items-center gap-3">
          {(currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.avatar) ? (
            <img
              src={currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.avatar}
              alt={currentUser.user_metadata?.full_name || currentUser.email}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center font-semibold">
              {getInitials(currentUser)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{currentUser.user_metadata?.full_name || currentUser.email}</p>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Projeto 14 Semanas</h1>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 rounded-lg shadow-lg">
          Semana {currentWeek + 1} — <span className="text-lg">{semanaAtiva}</span>
        </p>
        {typeof daysRemaining === 'number' && (
          <p className="text-sm font-semibold text-white bg-orange-500/60 px-3 py-1 rounded shadow">⏱ Faltam {daysRemaining} dias</p>
        )}
      </div>

<div className="w-full max-w-md rounded-lg p-4 shadow-xl border border-transparent bg-gradient-to-br from-indigo-800 via-purple-800 to-black">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs uppercase tracking-widest text-gray-400">
      Semana {currentWeek + 1}
    </span>

    <span className="text-xs font-semibold text-blue-400">
      {SEMANAS[currentWeek]}
    </span>
  </div>

  <p className="text-lg font-semibold text-white leading-snug">
    {CONTEXTO_SEMANAS[currentWeek]?.frase}
  </p>

  <div className="mt-3 flex items-start gap-2">
    <span className="text-blue-400">▶</span>
    <p className="text-sm text-gray-300">
      {CONTEXTO_SEMANAS[currentWeek]?.acao}
    </p>
  </div>
</div>
      {/* AGENDA DE HOJE */}
      <div className="w-full max-w-md border rounded p-4 bg-gradient-to-br from-white/3 to-white/2 shadow-lg backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-3 text-white">Agenda de hoje</h2>
        {userHabits.length === 0 ? (
          <p className="text-sm text-gray-300">Nenhum hábito agendado.</p>
        ) : (
          (() => {
            const isSunday = new Date().getDay() === 0
            const todayStr = new Date().toISOString().split('T')[0]
            const todays = userHabits.filter((h) => h.frequency === 'daily' || (h.frequency === 'weekly' && isSunday))
            return todays.length === 0 ? (
              <p className="text-sm text-gray-300">Nenhum hábito para hoje.</p>
            ) : (
              <ul className="space-y-2">
                {todays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.frequency === 'daily' ? 'Diário' : 'Semanal'}</p>
                    </div>
                    {checks.some((c) => c.habit_id === h.id && c.check_date === todayStr) ? (
                      <span className="text-xs text-green-600 font-semibold">✔</span>
                    ) : (
                      <button onClick={() => handleCheckHabitToday(h.id)} disabled={checkingHabitId === h.id} className="text-xs px-2 py-1 rounded bg-black text-white">Check</button>
                    )}
                  </li>
                ))}
              </ul>
            )
          })()
        )}
      </div>

      {/* MINHA ROTINA */}
      <div className="w-full max-w-md border rounded p-4 bg-gradient-to-br from-white/3 to-white/2 shadow-lg backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-3">Minha rotina</h2>
        {userHabits.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum hábito adicionado ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {userHabits.map((h) => {
              const totalChecks = checks.filter(
               (c) => c.habit_id === h.id
               ).length
              const totalPossible =
                h.frequency === 'daily'
                ? daysRemaining
                : Math.ceil((daysRemaining || 0) / 7)
              const progressPercent =
                totalPossible > 0
                  ? Math.min(100, Math.round((totalChecks / totalPossible) * 100))
                  : 0

              return (
                <li key={h.id} className="border rounded px-3 py-3 space-y-2 bg-gradient-to-br from-gray-800/60 to-black/40 shadow-md" >
                  {/* Nome e frequência */}
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-3">
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs font-semibold text-gray-300 mb-1">
                        {totalChecks} / {totalPossible} • <span className="text-cyan-300">{progressPercent}%</span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {checks.some(
                        (c) => c.habit_id === h.id && c.check_date === new Date().toISOString().split('T')[0]
                      ) ? (
                        <span className="text-xs text-green-300 font-semibold">✔ Feito hoje</span>
                      ) : (
                        <button onClick={() => handleCheckHabitToday(h.id)} disabled={checkingHabitId === h.id} className="text-xs px-2 py-1 rounded bg-gradient-to-r from-emerald-400 to-green-600 text-black font-semibold shadow">Check hoje</button>
                      )}
                      <button onClick={() => handleDeleteHabit(h.id)} className="text-xs px-2 py-1 rounded bg-red-600/80 hover:bg-red-700 text-white font-semibold shadow">🗑</button>
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs font-semibold text-gray-300 mt-1">
                      {totalChecks} / {totalPossible} • <span className="text-cyan-300">{progressPercent}%</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="w-full max-w-md border rounded p-4 bg-gradient-to-br from-white/3 to-white/2 shadow-lg backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-2">Criar rotina personalizada</h2>
        <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Nome do hábito" value={customName} onChange={(e) => setCustomName(e.target.value)} />
        <label className="text-xs text-gray-600">Métrica</label>
        <select value={customMetric} onChange={(e) => setCustomMetric(e.target.value)} className="w-full border rounded px-3 py-2 mb-2">
          <option value="minutes">Minutos</option>
          <option value="count">Quantidade</option>
          <option value="money">Reais</option>
          <option value="check">Check (sim/não)</option>
        </select>
        {customMetric !== 'check' && (
          <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Meta (ex: 20)" value={customTarget} onChange={(e) => setCustomTarget(e.target.value)} />
        )}
        <label className="text-xs text-gray-600">Frequência</label>
        <select value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)} className="w-full border rounded px-3 py-2 mb-2">
          <option value="daily">Diário</option>
          <option value="weekly">Semanal</option>
        </select>
        <button onClick={handleCreateCustomHabit} className="w-full py-2 rounded bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md"> Criar hábito </button>
      </div>
      {/* ROTINAS SUGERIDAS */}
      <div className="w-full max-w-md border rounded p-4 bg-gradient-to-br from-white/3 to-white/2 shadow-lg backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-3">Rotinas sugeridas</h2>
        <ul className="space-y-3">
          {HABITOS_SUGERIDOS.map((h) => (
              <li key={h.name} className="border rounded p-3 bg-gradient-to-br from-gray-800/40 to-black/20">
                <p className="font-medium text-white">{h.name}</p>
                <p className="text-sm text-gray-300">{h.description}</p>
                <p className="text-xs text-gray-400 mt-1"> Pilar: {h.pillar} •{' '} {h.frequency === 'daily' ? 'Diário' : 'Semanal'} </p>
              <button onClick={() => handleAddSuggestedHabit(h)} disabled={userHabits.some( (uh) => uh.name.toLowerCase() === h.name.toLowerCase() )} className={`mt-2 px-3 py-1 text-sm rounded ${ userHabits.some( (uh) => uh.name.toLowerCase() === h.name.toLowerCase() ) ? 'bg-gray-300 text-gray-600' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow' }`} > {userHabits.some( (uh) => uh.name.toLowerCase() === h.name.toLowerCase() ) ? '✔ Já está na sua rotina' : '➕ Adicionar à minha rotina'} </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-xs text-gray-500">Supabase conectado</div>
    </main>
  )
}
