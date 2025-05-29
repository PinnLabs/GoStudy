"use client"

import { useState, useEffect, useRef } from "react"

export default function StudyTimer() {
  const [time, setTime] = useState(0) // tempo em segundos
  const [isRunning, setIsRunning] = useState(false)
  const [showStopModal, setShowStopModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [studyGoal, setStudyGoal] = useState("")
  const [goalInput, setGoalInput] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [weeklyData, setWeeklyData] = useState<Record<string, number>>({})
  const [weeklyTotal, setWeeklyTotal] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Marcar quando o componente é montado no cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Carregar dados do localStorage apenas no cliente
  useEffect(() => {
    if (isClient) {
      const savedGoal = localStorage.getItem("studyGoal")
      if (!savedGoal) {
        setShowOnboarding(true)
      } else {
        setStudyGoal(savedGoal)
      }

      // Carregar dados semanais
      const data = getWeeklyData()
      setWeeklyData(data)
      setWeeklyTotal(calculateWeeklyTotal(data))
    }
  }, [isClient])

  // Atualizar dados semanais quando o tempo mudar
  useEffect(() => {
    if (isClient) {
      const data = getWeeklyData()
      setWeeklyData(data)
      setWeeklyTotal(calculateWeeklyTotal(data))
    }
  }, [time, isClient])

  // Função para obter o dia da semana atual
  const getCurrentDay = () => {
    const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
    return days[new Date().getDay()]
  }

  // Função para obter a semana atual (ano-semana)
  const getCurrentWeek = () => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${weekNumber}`
  }

  // Função para salvar tempo estudado por dia
  const saveDailyTime = (timeToAdd: number) => {
    if (!isClient) return

    const currentWeek = getCurrentWeek()
    const currentDay = getCurrentDay()
    const savedData = localStorage.getItem("dailyStudyTime")
    const dailyData = savedData ? JSON.parse(savedData) : {}

    if (!dailyData[currentWeek]) {
      dailyData[currentWeek] = {}
    }

    dailyData[currentWeek][currentDay] = (dailyData[currentWeek][currentDay] || 0) + timeToAdd
    localStorage.setItem("dailyStudyTime", JSON.stringify(dailyData))

    // Atualizar estado
    const newWeeklyData = getWeeklyData()
    setWeeklyData(newWeeklyData)
    setWeeklyTotal(calculateWeeklyTotal(newWeeklyData))
  }

  // Função para obter dados da semana atual
  const getWeeklyData = () => {
    if (!isClient) return {}

    const currentWeek = getCurrentWeek()
    const savedData = localStorage.getItem("dailyStudyTime")
    const dailyData = savedData ? JSON.parse(savedData) : {}
    return dailyData[currentWeek] || {}
  }

  // Função para calcular o total semanal
  const calculateWeeklyTotal = (data: Record<string, number>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(data).reduce((total: number, time: any) => total + time, 0)
  }

  // Formatar tempo para HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: secs.toString().padStart(2, "0"),
    }
  }

  // Formatar tempo para exibição compacta (ex: 2h 30m)
  const formatTimeCompact = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Salvar objetivo de estudo
  const saveStudyGoal = () => {
    if (goalInput.trim() && isClient) {
      localStorage.setItem("studyGoal", goalInput.trim())
      setStudyGoal(goalInput.trim())
      setShowOnboarding(false)
    }
  }

  // Iniciar/pausar timer
  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  // Resetar timer
  const resetTimer = () => {
    setIsRunning(false)
    setTime(0)
  }

  // Mostrar modal de parar
  const handleStopClick = () => {
    if (time > 0) {
      setShowStopModal(true)
    }
  }

  // Confirmar parada e salvar tempo restante
  const confirmStop = () => {
    if (time > 0 && isClient) {
      // Salvar apenas o tempo que não foi salvo ainda (resto da divisão por 60)
      const remainingTime = time % 60
      if (remainingTime > 0) {
        saveDailyTime(remainingTime)
      }
    }
    setIsRunning(false)
    setTime(0)
    setShowStopModal(false)
  }

  // Cancelar parada e continuar estudando
  const cancelStop = () => {
    setShowStopModal(false)
    setIsRunning(true)
  }

  // Effect para controlar o timer e salvar periodicamente
  useEffect(() => {
    if (isRunning && isClient) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime + 1

          // Salvar no localStorage a cada minuto (60 segundos)
          if (newTime % 60 === 0) {
            saveDailyTime(60) // Salva 1 minuto
          }

          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isClient])

  // Função para obter tempo total de um dia (salvo + sessão atual se for hoje)
  const getDayTotalTime = (day: string) => {
    if (!isClient) return 0

    const savedTime = weeklyData[day] || 0
    const currentDay = getCurrentDay()

    // Se for o dia atual, adicionar o tempo da sessão atual
    if (day === currentDay) {
      return savedTime + time
    }

    return savedTime
  }

  const timeFormatted = formatTime(time)
  const weeklyTotalFormatted = formatTime(weeklyTotal)

  const daysOfWeek = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]

  // Renderizar um placeholder durante a hidratação
  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-8xl font-light text-white font-mono tracking-wider">00</span>
            <span className="text-6xl font-light text-gray-500 pb-2">:</span>
            <span className="text-8xl font-light text-white font-mono tracking-wider">00</span>
            <span className="text-6xl font-light text-gray-500 pb-2">:</span>
            <span className="text-8xl font-light text-white font-mono tracking-wider">00</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative">
{/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className=" rounded-lg p-8 max-w-md w-full text-center border border-gray-400">
            <h3 className="text-2xl font-light text-white mb-6">Para o que você está estudando?</h3>

            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Ex: EFOMM, ESA, PREP, ENEM, EN, CN....."
              className="w-full text-white px-4 py-3 rounded-lg border border-gray-400 focus:border-gray-500 focus:outline-none mb-6"
              onKeyPress={(e) => e.key === "Enter" && saveStudyGoal()}
              autoFocus
            />

            <button
              onClick={saveStudyGoal}
              disabled={!goalInput.trim()}
              className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Começar
            </button>
          </div>
        </div>
      )}
      {/* Study Goal */}
      {studyGoal && (
        <div className="text-center mb-8">
          <div className="text-sm text-gray-500 uppercase tracking-widest">rumo à {studyGoal}</div>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-8xl font-light text-white font-mono tracking-wider">{timeFormatted.hours}</span>
          <span className="text-6xl font-light text-gray-500 pb-2">:</span>
          <span className="text-8xl font-light text-white font-mono tracking-wider">{timeFormatted.minutes}</span>
          <span className="text-6xl font-light text-gray-500 pb-2">:</span>
          <span className="text-8xl font-light text-white font-mono tracking-wider">{timeFormatted.seconds}</span>
        </div>

        <div className="flex items-center justify-center gap-12 text-xs text-gray-600 uppercase tracking-widest">
          <span>hours</span>
          <span>minutes</span>
          <span>seconds</span>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="text-center mb-8">
        <div className="text-sm text-gray-600 uppercase tracking-widest mb-4">esta semana</div>
        <div className="text-2xl font-light text-gray-400 font-mono mb-6">
          {weeklyTotalFormatted.hours}:{weeklyTotalFormatted.minutes}:{weeklyTotalFormatted.seconds}
        </div>

        {/* Daily Breakdown */}
        <div className="grid grid-cols-7 gap-2 max-w-md mx-auto">
          {daysOfWeek.map((day) => {
            const dayTime = getDayTotalTime(day)
            const isToday = day === getCurrentDay()
            return (
              <div key={day} className="text-center">
                <div className={`text-xs uppercase tracking-wide mb-1 ${isToday ? "text-white" : "text-gray-600"}`}>
                  {day.slice(0, 3)}
                </div>
                <div className={`text-sm font-mono ${isToday ? "text-gray-300" : "text-gray-500"}`}>
                  {dayTime > 0 ? formatTimeCompact(dayTime) : "0m"}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button onClick={toggleTimer} className="text-white hover:text-gray-300 transition-colors duration-200">
          <span className="text-2xl">{isRunning ? "⏸" : "▶"}</span>
        </button>

        <div
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${isRunning ? "bg-white" : "bg-gray-700"}`}
        ></div>

        <button onClick={resetTimer} className="text-gray-600 hover:text-gray-400 transition-colors duration-200">
          <span className="text-xl">↻</span>
        </button>

        {time > 0 && (
          <button onClick={handleStopClick} className="text-red-600 hover:text-red-400 transition-colors duration-200">
            <span className="text-xl">⏹</span>
          </button>
        )}
      </div>

{/* Stop Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className=" rounded-lg p-8 max-w-md w-full text-center border border-gray-400">
            <div className="mb-6">
              <h3 className="text-xl font-light text-white mb-4">Vai parar guerreiro?</h3>
              <p className="text-gray-400 leading-relaxed">
                Tem certeza? Tem alguém com menos recursos que você que vai estar no lugar que você sonha
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={cancelStop}
                className="px-6 py-3 bg-white hover:bg-gray-500 text-black rounded-lg transition-colors duration-200 font-medium"
              >
                Vou voltar estudar agora mesmo, slk
              </button>

              <button
                onClick={confirmStop}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors duration-200"
              >
                Sim, eu tento próximo ano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
