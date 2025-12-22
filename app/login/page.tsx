'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleEnter = async () => {
    setErrorMsg(null)

    const e = email.trim().toLowerCase()
    if (!e || !password) {
      setErrorMsg('Preencha e-mail e senha para entrar.')
      return
    }

    setLoading(true)
    try {
      // 1) tenta login
      const signIn = await supabase.auth.signInWithPassword({
        email: e,
        password,
      })

      if (!signIn.error && signIn.data.session) {
        router.push('/')
        return
      }

      // 2) se falhar, cria conta automaticamente (onboarding humano)
      const signUp = await supabase.auth.signUp({
        email: e,
        password,
      })

      if (signUp.error) {
        setErrorMsg('Não foi possível entrar agora. Confira seus dados e tente novamente.')
        return
      }

      // 3) tenta logar após criar
      const signInAfter = await supabase.auth.signInWithPassword({
        email: e,
        password,
      })

      if (signInAfter.error || !signInAfter.data.session) {
        setErrorMsg(
          'Conta criada. Agora confira seu e-mail para confirmar e depois volte para entrar.'
        )
        return
      }

      router.push('/')
    } catch (err) {
      console.error(err)
      setErrorMsg('Algo falhou aqui. Tenta de novo em alguns segundos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 via-purple-950 to-black text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-2xl">
        {/* Identidade */}
        <div className="mb-5">
          <p className="text-xs tracking-widest uppercase text-white/60">Projeto</p>
          <h1 className="text-3xl font-bold leading-tight mt-1">14 Semanas</h1>
          <p className="text-sm text-white/70 mt-2">
            Uma decisão por dia. Um ciclo de transformação real.
          </p>

          <div className="mt-4 rounded-xl border border-yellow-300/10 bg-yellow-300/5 p-3">
            <p className="text-sm text-white/80">
              Você não começa do zero. Você entra no ponto exato da jornada.
            </p>
            <p className="text-xs text-white/60 mt-1">
              Criado por <span className="font-semibold text-white">Kadu</span>.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/60">Seu e-mail</label>
            <input
              className="w-full mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-400/40"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Crie uma senha agora</label>
            <input
              className="w-full mt-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-400/40"
              placeholder="Use algo que você lembre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
            <p className="text-xs text-white/50 mt-1">
              Você vai usar essa mesma senha sempre que voltar.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-200">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleEnter}
            disabled={loading}
            className={`w-full mt-2 rounded-lg py-2 font-semibold shadow-lg transition ${
              loading
                ? 'bg-white/20 text-white/70 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95'
            }`}
          >
            {loading ? 'Entrando…' : 'Entrar no projeto'}
          </button>

          <p className="text-xs text-white/50 mt-3">
            Você pode sair e voltar quando quiser. O progresso é seu.
          </p>
        </div>
      </div>
    </main>
  )
}
