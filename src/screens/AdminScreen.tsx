import { useState, useCallback, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useContentStore } from '../stores/contentStore'
import { useDisplayStore } from '../stores/displayStore'
import { useAdminStore } from '../stores/adminStore'
import { useSettingsStore } from '../stores/settingsStore'
import { adminContentService } from '../services/adminContentService'
import { systemSettingsService } from '../services/systemSettingsService'
import { storageService } from '../services/storageService'
import { pinService } from '../services/pinService'
import { driveAuthService } from '../services/driveAuthService'
import { driveSyncService } from '../services/driveSyncService'
import { CapacitorAndroidKiosk } from '@capgo/capacitor-android-kiosk'
import { useSyncStore } from '../stores/syncStore'
import { Toast } from '../components/Toast'
import type { YiddishPhrase } from '../types/YiddishPhrase'
import type { Birthday } from '../types/Birthday'

// ── Colores ───────────────────────────────────────────────────────────────────

const AMBER  = '#C8956C'
const SEPIA  = '#8B6F5E'
const CREAM  = '#F5F0E8'
const NIGHT  = '#1A1210'
const CHARCOAL = '#2C2420'

// ── Estilos compartidos ───────────────────────────────────────────────────────

const screenStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: NIGHT,
  fontFamily: "'Inter', sans-serif",
  color: CREAM,
  transition: 'opacity 2s ease',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  backgroundColor: CHARCOAL,
  padding: '14px 24px',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
}

const backButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: CREAM,
  fontFamily: "'Inter', sans-serif",
  fontSize: '18px',
  cursor: 'pointer',
  padding: '8px 0',
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px',
}

const sectionStyle: CSSProperties = {
  marginBottom: '40px',
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: AMBER,
  marginBottom: '16px',
  borderBottom: `1px solid ${CHARCOAL}`,
  paddingBottom: '8px',
}

const itemRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: `1px solid rgba(245,240,232,0.1)`,
  gap: '12px',
}

const itemTextStyle: CSSProperties = {
  flex: 1,
  fontSize: '16px',
  lineHeight: '1.5',
}

const actionBtnStyle: CSSProperties = {
  background: 'none',
  border: `1px solid rgba(245,240,232,0.3)`,
  borderRadius: '6px',
  color: CREAM,
  fontFamily: "'Inter', sans-serif",
  fontSize: '16px',
  padding: '6px 14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const deleteBtnStyle: CSSProperties = {
  ...actionBtnStyle,
  borderColor: `rgba(139,111,94,0.5)`,
  color: SEPIA,
}

const inputStyle: CSSProperties = {
  width: '100%',
  backgroundColor: CHARCOAL,
  border: `1px solid rgba(245,240,232,0.2)`,
  borderRadius: '6px',
  color: CREAM,
  fontFamily: "'Inter', sans-serif",
  fontSize: '16px',
  padding: '10px 12px',
  boxSizing: 'border-box',
}

const primaryBtnStyle: CSSProperties = {
  backgroundColor: AMBER,
  border: 'none',
  borderRadius: '6px',
  color: NIGHT,
  fontFamily: "'Inter', sans-serif",
  fontSize: '16px',
  fontWeight: 600,
  padding: '10px 24px',
  cursor: 'pointer',
}

const secondaryBtnStyle: CSSProperties = {
  ...actionBtnStyle,
  marginLeft: '8px',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/
const HH_MM_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

function isDuplicate(phrase: YiddishPhrase, list: YiddishPhrase[]): boolean {
  return list.some(
    (e) => e.yiddish === phrase.yiddish &&
           e.transliteration === phrase.transliteration &&
           e.spanish === phrase.spanish
  )
}

function isDuplicateBirthday(b: Birthday, list: Birthday[]): boolean {
  return list.some(
    (e) => e.name === b.name && e.date === b.date && e.calendar === b.calendar
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AdminScreen() {
  const yiddishPhrases   = useContentStore((s) => s.yiddishPhrases)
  const birthdays        = useContentStore((s) => s.birthdays)
  const welcomeConfig    = useContentStore((s) => s.welcomeConfig)
  const photos           = useContentStore((s) => s.photos)
  const lastSync         = useSyncStore((s) => s.lastSync)
  const setYiddishPhrases  = useContentStore((s) => s.setYiddishPhrases)
  const setBirthdays       = useContentStore((s) => s.setBirthdays)
  const setWelcomeConfig   = useContentStore((s) => s.setWelcomeConfig)
  const setMode            = useDisplayStore((s) => s.setMode)
  const setAuthenticated   = useAdminStore((s) => s.setAuthenticated)
  const photoRotationInterval  = useSettingsStore((s) => s.photoRotationInterval)
  const setPhotoRotationInterval = useSettingsStore((s) => s.setPhotoRotationInterval)
  const nightModeStart     = useSettingsStore((s) => s.nightModeStart)
  const nightModeEnd       = useSettingsStore((s) => s.nightModeEnd)
  const setNightModeStart  = useSettingsStore((s) => s.setNightModeStart)
  const setNightModeEnd    = useSettingsStore((s) => s.setNightModeEnd)
  const yiddishScript      = useSettingsStore((s) => s.yiddishScript)
  const setYiddishScript   = useSettingsStore((s) => s.setYiddishScript)

  // Salida
  const [exiting, setExiting] = useState(false)

  // Toast — P1: timer ref para evitar acumulación; P9: dos fases para fade-out limpio
  const [toastData, setToastData] = useState<{ message: string; color: string } | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Yiddish — formulario add/edit
  const [yiddishForm, setYiddishForm] = useState(false)
  const [editingYiddishIdx, setEditingYiddishIdx] = useState<number | null>(null)
  const [yiddishField, setYiddishField]   = useState('')
  const [transField, setTransField]       = useState('')
  const [spanishField, setSpanishField]   = useState('')
  const [yiddishErrors, setYiddishErrors] = useState({ yiddish: false, trans: false, spanish: false })

  // Yiddish — import
  const [importText, setImportText] = useState('')

  // Cumpleaños — formulario add/edit
  const [bdayForm, setBdayForm]   = useState(false)
  const [editingBdayId, setEditingBdayId] = useState<string | null>(null)
  const [bdayName, setBdayName]   = useState('')
  const [bdayDate, setBdayDate]   = useState('')
  const [bdayCalendar, setBdayCalendar] = useState<'gregorian' | 'hebrew'>('gregorian')
  const [bdayErrors, setBdayErrors] = useState({ name: false, date: false })
  const [bdayImportText, setBdayImportText] = useState('')

  // Bienvenida
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [welcomeAuthor,  setWelcomeAuthor]  = useState(welcomeConfig.authorName)
  const [welcomeMessage, setWelcomeMessage] = useState(welcomeConfig.message)
  const [welcomePhoto,   setWelcomePhoto]   = useState(welcomeConfig.photoPath)

  // Configuración — rotación y night mode
  const [intervalInput,  setIntervalInput]  = useState(String(photoRotationInterval / 1000))
  const [nightStartInput, setNightStartInput] = useState(nightModeStart)
  const [nightEndInput,   setNightEndInput]   = useState(nightModeEnd)
  const [configErrors, setConfigErrors] = useState({ interval: false, nightStart: false, nightEnd: false })

  // PIN
  const [currentPin, setCurrentPin] = useState('')
  const [newPin,     setNewPin]     = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinErrors,  setPinErrors]  = useState({ current: false, newPin: false, confirm: false })

  // Fotos / Drive SA
  const [isSAConfigured, setIsSAConfigured] = useState<boolean | null>(null)
  const [isSyncing, setIsSyncing]           = useState(false)

  // Kiosk mode
  const [kioskEnabled, setKioskEnabled] = useState(true)

  function showToast(message: string, color: string, duration = 2000) {
    if (toastTimerRef.current)     clearTimeout(toastTimerRef.current)
    if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current)
    setToastData({ message, color })
    setToastVisible(true)
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false)
      toastFadeTimerRef.current = setTimeout(() => setToastData(null), 300)
    }, duration)
  }

  // ── Navegación ──────────────────────────────────────────────────────────────

  function handleBack() {
    if (exiting) return  // P2: guard contra double-fire
    setExiting(true)
    setTimeout(() => {
      setAuthenticated(false)
      setMode('kiosk')
    }, 2000)
  }

  // ── Yiddish Script (hebreo / fonética) ──────────────────────────────────────

  const handleYiddishScriptChange = useCallback(async (next: 'hebrew' | 'phonetic') => {
    setYiddishScript(next)
    try {
      await systemSettingsService.saveYiddishScript(next)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [setYiddishScript])

  // ── Yiddish CRUD ────────────────────────────────────────────────────────────

  function openAddYiddish() {
    setEditingYiddishIdx(null)
    setYiddishField('')
    setTransField('')
    setSpanishField('')
    setYiddishErrors({ yiddish: false, trans: false, spanish: false })
    setYiddishForm(true)
  }

  function openEditYiddish(idx: number) {
    const p = yiddishPhrases[idx]
    setEditingYiddishIdx(idx)
    setYiddishField(p.yiddish)
    setTransField(p.transliteration)
    setSpanishField(p.spanish)
    setYiddishErrors({ yiddish: false, trans: false, spanish: false })
    setYiddishForm(true)
  }

  function cancelYiddishForm() {
    setYiddishForm(false)
    setEditingYiddishIdx(null)
  }

  const handleSaveYiddish = useCallback(async () => {
    // yiddish (letras hebreas) es opcional — si está vacío, el render hace fallback
    // a transliteration en modo 'hebrew'. trans + spanish siguen siendo requeridos.
    const errors = {
      yiddish: false,
      trans:   transField.trim() === '',
      spanish: spanishField.trim() === '',
    }
    setYiddishErrors(errors)
    if (errors.trans || errors.spanish) return

    const phrase: YiddishPhrase = {
      yiddish:       yiddishField.trim(),
      transliteration: transField.trim(),
      spanish:       spanishField.trim(),
    }

    let updated: YiddishPhrase[]
    if (editingYiddishIdx !== null) {
      updated = yiddishPhrases.map((p, i) => i === editingYiddishIdx ? phrase : p)
    } else {
      updated = [...yiddishPhrases, phrase]
    }

    try {
      await adminContentService.saveYiddishPhrases(updated)
      setYiddishPhrases(updated)
      setYiddishForm(false)
      setEditingYiddishIdx(null)
      showToast('Guardado ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [yiddishField, transField, spanishField, editingYiddishIdx, yiddishPhrases, setYiddishPhrases])

  const handleDeleteYiddish = useCallback(async (idx: number) => {
    if (!window.confirm('¿Eliminar esta frase?')) return
    const updated = yiddishPhrases.filter((_, i) => i !== idx)
    try {
      await adminContentService.saveYiddishPhrases(updated)
      setYiddishPhrases(updated)
      showToast('Frase eliminada ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [yiddishPhrases, setYiddishPhrases])

  // ── Yiddish Import ──────────────────────────────────────────────────────────

  const handleImportYiddish = useCallback(async () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(importText.trim())
    } catch {
      showToast('Formato inválido — revisá el JSON', SEPIA)
      return
    }

    if (!Array.isArray(parsed)) {
      showToast('Formato inválido — revisá el JSON', SEPIA)
      return
    }

    const valid: YiddishPhrase[] = []
    for (const item of parsed) {
      if (
        typeof item === 'object' && item !== null &&
        typeof (item as Record<string, unknown>).yiddish === 'string' &&
        typeof (item as Record<string, unknown>).transliteration === 'string' &&
        typeof (item as Record<string, unknown>).spanish === 'string' &&
        (item as Record<string, string>).transliteration.trim() !== '' &&
        (item as Record<string, string>).spanish.trim() !== ''
      ) {
        valid.push({
          yiddish:        (item as Record<string, string>).yiddish.trim(),
          transliteration: (item as Record<string, string>).transliteration.trim(),
          spanish:        (item as Record<string, string>).spanish.trim(),
        })
      } else {
        showToast('Formato inválido — revisá el JSON', SEPIA)
        return
      }
    }

    const newPhrases = valid.filter((p) => !isDuplicate(p, yiddishPhrases))
    if (newPhrases.length === 0) {
      setImportText('')  // P8: limpiar textarea aunque todo sea duplicado
      showToast('0 frases importadas (todas ya existían)', AMBER)
      return
    }

    const updated = [...yiddishPhrases, ...newPhrases]
    try {
      await adminContentService.saveYiddishPhrases(updated)
      setYiddishPhrases(updated)
      setImportText('')
      showToast(`${newPhrases.length} frases importadas`, AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [importText, yiddishPhrases, setYiddishPhrases])

  // ── Cumpleaños CRUD ─────────────────────────────────────────────────────────

  function openAddBirthday() {
    setEditingBdayId(null)
    setBdayName('')
    setBdayDate('')
    setBdayCalendar('gregorian')
    setBdayErrors({ name: false, date: false })
    setBdayForm(true)
  }

  function openEditBirthday(bday: Birthday) {
    setEditingBdayId(bday.id)
    setBdayName(bday.name)
    setBdayDate(bday.date)
    setBdayCalendar(bday.calendar)
    setBdayErrors({ name: false, date: false })
    setBdayForm(true)
  }

  function cancelBdayForm() {
    setBdayForm(false)
    setEditingBdayId(null)
  }

  const handleSaveBirthday = useCallback(async () => {
    const errors = {
      name: bdayName.trim() === '',
      date: bdayDate.trim() === '' || !DATE_REGEX.test(bdayDate.trim()),  // P5: validar formato
    }
    setBdayErrors(errors)
    if (errors.name || errors.date) return

    let updated: Birthday[]
    if (editingBdayId !== null) {
      updated = birthdays.map((b) =>
        b.id === editingBdayId
          ? { ...b, name: bdayName.trim(), date: bdayDate.trim(), calendar: bdayCalendar }
          : b
      )
    } else {
      updated = [...birthdays, {
        id:   crypto.randomUUID(),
        name: bdayName.trim(),
        date: bdayDate.trim(),
        calendar: bdayCalendar,
      }]
    }

    try {
      await adminContentService.saveBirthdays(updated)
      setBirthdays(updated)
      setBdayForm(false)
      setEditingBdayId(null)
      showToast('Guardado ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [bdayName, bdayDate, bdayCalendar, editingBdayId, birthdays, setBirthdays])

  const handleDeleteBirthday = useCallback(async (id: string) => {
    if (!window.confirm('¿Eliminar este cumpleaños?')) return
    const updated = birthdays.filter((b) => b.id !== id)
    try {
      await adminContentService.saveBirthdays(updated)
      setBirthdays(updated)
      showToast('Cumpleaños eliminado ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [birthdays, setBirthdays])

  const handleExportBirthdays = useCallback(() => {
    const data = birthdays.map(({ name, date, calendar }) => ({ name, date, calendar }))
    setBdayImportText(JSON.stringify(data, null, 2))
    showToast(`${birthdays.length} cumpleaños exportados — copiá el texto`, AMBER)
  }, [birthdays])

  const handleImportBirthdays = useCallback(async () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(bdayImportText.trim())
    } catch {
      showToast('Formato inválido — revisá el JSON', SEPIA)
      return
    }
    if (!Array.isArray(parsed)) {
      showToast('Formato inválido — revisá el JSON', SEPIA)
      return
    }

    const valid: Birthday[] = []
    for (const item of parsed) {
      const rec = item as Record<string, unknown>
      if (
        typeof item === 'object' && item !== null &&
        typeof rec.name === 'string' && rec.name.trim() !== '' &&
        typeof rec.date === 'string' && DATE_REGEX.test(rec.date.trim())
      ) {
        valid.push({
          id:       crypto.randomUUID(),
          name:     rec.name.trim(),
          date:     rec.date.trim(),
          calendar: rec.calendar === 'hebrew' ? 'hebrew' : 'gregorian',  // default gregorian
        })
      } else {
        showToast('Formato inválido — revisá el JSON', SEPIA)
        return
      }
    }

    const newBdays = valid.filter((b) => !isDuplicateBirthday(b, birthdays))
    if (newBdays.length === 0) {
      setBdayImportText('')
      showToast('0 cumpleaños importados (todos ya existían)', AMBER)
      return
    }

    const updated = [...birthdays, ...newBdays]
    try {
      await adminContentService.saveBirthdays(updated)
      setBirthdays(updated)
      setBdayImportText('')
      showToast(`${newBdays.length} cumpleaños importados`, AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [bdayImportText, birthdays, setBirthdays])

  // ── Bienvenida ──────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // Foto a disco (Filesystem); solo el path se guarda luego en Preferences.
      const path = await storageService.saveWelcomePhoto(file)
      setWelcomePhoto(path)
    } catch {
      showToast('Error al guardar la foto', SEPIA)
    }
  }

  const handleSaveWelcome = useCallback(async () => {
    const config = {
      photoPath:  welcomePhoto,
      message:    welcomeMessage,
      authorName: welcomeAuthor,
    }
    try {
      await storageService.saveWelcomeConfig(config)
      setWelcomeConfig(config)
      showToast('Bienvenida guardada ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [welcomePhoto, welcomeMessage, welcomeAuthor, setWelcomeConfig])

  // ── Configuración ────────────────────────────────────────────────────────────

  const handleSaveConfig = useCallback(async () => {
    const secs = parseInt(intervalInput, 10)
    const errors = {
      interval:   isNaN(secs) || secs < 10 || secs > 86400,
      nightStart: !HH_MM_REGEX.test(nightStartInput),
      nightEnd:   !HH_MM_REGEX.test(nightEndInput),
    }
    setConfigErrors(errors)
    if (errors.interval || errors.nightStart || errors.nightEnd) return

    const ms = secs * 1000
    try {
      // P6: guardar en paralelo — si falla cualquiera, el store NO se actualiza
      await Promise.all([
        systemSettingsService.savePhotoRotationInterval(ms),
        systemSettingsService.saveNightModeStart(nightStartInput),
        systemSettingsService.saveNightModeEnd(nightEndInput),
      ])
      setPhotoRotationInterval(ms)
      setNightModeStart(nightStartInput)
      setNightModeEnd(nightEndInput)
      showToast('Configuración guardada ✓', AMBER)
    } catch {
      showToast('Error al guardar', SEPIA)
    }
  }, [intervalInput, nightStartInput, nightEndInput,
      setPhotoRotationInterval, setNightModeStart, setNightModeEnd])

  // ── PIN ──────────────────────────────────────────────────────────────────────

  const handleSavePin = useCallback(async () => {
    const errors = {
      current: currentPin.trim() === '',
      newPin:  newPin.trim() === '' || newPin !== confirmPin,
      confirm: confirmPin.trim() === '' || newPin !== confirmPin,
    }
    setPinErrors(errors)
    if (errors.current || errors.newPin || errors.confirm) return

    try {
      const ok = await pinService.verifyPin(currentPin.trim())  // P4: trim antes de verificar
      if (!ok) {
        showToast('PIN incorrecto', SEPIA)
        setPinErrors((prev) => ({ ...prev, current: true }))
        return
      }
      await pinService.setPin(newPin.trim())  // P4: trim antes de guardar
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setPinErrors({ current: false, newPin: false, confirm: false })
      showToast('PIN cambiado ✓', AMBER)
    } catch {
      showToast('Error al cambiar PIN', SEPIA)
    }
  }, [currentPin, newPin, confirmPin])

  // ── Fotos / Drive SA ─────────────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      const configured = await driveAuthService.isAuthenticated()
      setIsSAConfigured(configured)
      // Sincronizar estado kiosk real (puede diferir si se llamó exitKioskMode en sesión anterior)
      try {
        const { isInKioskMode } = await CapacitorAndroidKiosk.isInKioskMode()
        setKioskEnabled(isInKioskMode)
      } catch {
        // Silencioso en web — defaultea a true
      }
    })()
  }, [])

  const handleForceSync = useCallback(async () => {
    if (!isSAConfigured || isSyncing) return
    setIsSyncing(true)
    try {
      const newCount = await driveSyncService.sync()
      if (newCount > 0) {
        showToast(`${newCount} fotos nuevas sincronizadas`, AMBER, 3000)
      } else {
        showToast('Sin fotos nuevas', AMBER, 2000)
      }
    } catch {
      showToast('Sin conexión — usando caché', SEPIA, 4000)
    } finally {
      setIsSyncing(false)
    }
  }, [isSAConfigured, isSyncing])

  // ── Sistema ──────────────────────────────────────────────────────────────────

  function handleRestart() {
    if (window.confirm('¿Reiniciar la aplicación?')) {
      window.location.reload()
    }
  }

  const handleSuspendKiosk = useCallback(async () => {
    try {
      await CapacitorAndroidKiosk.exitKioskMode()
      setKioskEnabled(false)
      showToast('Kiosk suspendido ✓', AMBER)
    } catch {
      showToast('Error al suspender kiosk', SEPIA)
    }
  }, [])

  const handleResumeKiosk = useCallback(async () => {
    try {
      await CapacitorAndroidKiosk.enterKioskMode({ restoreAfterReboot: true, relaunch: true })
      setKioskEnabled(true)
      showToast('Kiosk reactivado ✓', AMBER)
    } catch {
      showToast('Error al reactivar kiosk', SEPIA)
    }
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ ...screenStyle, opacity: exiting ? 0 : 1 }} data-testid="admin-screen">
      {/* Header */}
      <div style={headerStyle}>
        <button style={backButtonStyle} onClick={handleBack} data-testid="btn-back">
          ← Volver al frame
        </button>
      </div>

      {/* Contenido scrollable */}
      <div style={contentStyle}>

        {/* ── Frases Yiddish ── */}
        <div style={sectionStyle} data-testid="section-yiddish">
          <div style={sectionTitleStyle}>Frases Yiddish</div>

          {/* Toggle script: hebreo vs fonética — persistencia inmediata */}
          <div data-testid="yiddish-script-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, color: CREAM, opacity: 0.8 }}>
              Mostrar frase en
            </label>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 500, color: CREAM }}>
                <input
                  type="radio"
                  name="yiddish-script"
                  value="hebrew"
                  checked={yiddishScript === 'hebrew'}
                  onChange={() => handleYiddishScriptChange('hebrew')}
                  data-testid="radio-script-hebrew"
                />
                Letras hebreas
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 500, color: CREAM }}>
                <input
                  type="radio"
                  name="yiddish-script"
                  value="phonetic"
                  checked={yiddishScript === 'phonetic'}
                  onChange={() => handleYiddishScriptChange('phonetic')}
                  data-testid="radio-script-phonetic"
                />
                Fonética
              </label>
            </div>
          </div>

          {/* Lista */}
          {yiddishPhrases.map((p, idx) => (
            <div key={p.yiddish + '-' + idx} style={itemRowStyle} data-testid={`yiddish-item-${idx}`}>
              <div style={itemTextStyle}>
                <div style={{ fontWeight: 500 }}>{p.yiddish}</div>
                <div style={{ opacity: 0.75, fontSize: '14px' }}>{p.transliteration} — {p.spanish}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button style={actionBtnStyle} onClick={() => openEditYiddish(idx)} data-testid={`yiddish-edit-${idx}`}>
                  Editar
                </button>
                <button style={deleteBtnStyle} onClick={() => handleDeleteYiddish(idx)} data-testid={`yiddish-delete-${idx}`}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {/* Formulario add/edit */}
          {!yiddishForm && (
            <button style={{ ...primaryBtnStyle, marginTop: '12px' }} onClick={openAddYiddish} data-testid="btn-add-yiddish">
              + Agregar frase
            </button>
          )}

          {yiddishForm && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} data-testid="yiddish-form">
              <input
                style={{ ...inputStyle, ...(yiddishErrors.yiddish ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="Yiddish"
                value={yiddishField}
                onChange={(e) => { setYiddishField(e.target.value); setYiddishErrors((prev) => ({ ...prev, yiddish: false })) }}
                data-testid="input-yiddish"
              />
              <input
                style={{ ...inputStyle, ...(yiddishErrors.trans ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="Transliteración"
                value={transField}
                onChange={(e) => { setTransField(e.target.value); setYiddishErrors((prev) => ({ ...prev, trans: false })) }}
                data-testid="input-trans"
              />
              <input
                style={{ ...inputStyle, ...(yiddishErrors.spanish ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="Español"
                value={spanishField}
                onChange={(e) => { setSpanishField(e.target.value); setYiddishErrors((prev) => ({ ...prev, spanish: false })) }}
                data-testid="input-spanish"
              />
              <div>
                <button style={primaryBtnStyle} onClick={handleSaveYiddish} data-testid="btn-save-yiddish">
                  Guardar
                </button>
                <button style={secondaryBtnStyle} onClick={cancelYiddishForm} data-testid="btn-cancel-yiddish">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Importar JSON */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: CREAM, opacity: 0.8 }}>
              Importar frases (JSON)
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder={'[{ "yiddish": "...", "transliteration": "...", "spanish": "..." }]'}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              data-testid="textarea-import"
            />
            <button style={{ ...primaryBtnStyle, marginTop: '8px' }} onClick={handleImportYiddish} data-testid="btn-import">
              Importar
            </button>
          </div>
        </div>

        {/* ── Cumpleaños ── */}
        <div style={sectionStyle} data-testid="section-birthdays">
          <div style={sectionTitleStyle}>Cumpleaños</div>

          {/* Lista */}
          {birthdays.map((b) => (
            <div key={b.id} style={itemRowStyle} data-testid={`bday-item-${b.id}`}>
              <div style={itemTextStyle}>
                <div style={{ fontWeight: 500 }}>
                  {b.name}
                  {b.calendar === 'hebrew' && (
                    <span
                      data-testid={`bday-hebrew-symbol-${b.id}`}
                      style={{ color: AMBER, opacity: 0.6, fontSize: '14px', marginLeft: '8px' }}
                    >
                      ✡
                    </span>
                  )}
                </div>
                <div style={{ opacity: 0.75, fontSize: '14px' }}>{b.date}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button style={actionBtnStyle} onClick={() => openEditBirthday(b)} data-testid={`bday-edit-${b.id}`}>
                  Editar
                </button>
                <button style={deleteBtnStyle} onClick={() => handleDeleteBirthday(b.id)} data-testid={`bday-delete-${b.id}`}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {/* Formulario add/edit */}
          {!bdayForm && (
            <button style={{ ...primaryBtnStyle, marginTop: '12px' }} onClick={openAddBirthday} data-testid="btn-add-bday">
              + Agregar cumpleaños
            </button>
          )}

          {bdayForm && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} data-testid="bday-form">
              <input
                style={{ ...inputStyle, ...(bdayErrors.name ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="Nombre"
                value={bdayName}
                onChange={(e) => { setBdayName(e.target.value); setBdayErrors((prev) => ({ ...prev, name: false })) }}
                data-testid="input-bday-name"
              />
              <input
                style={{ ...inputStyle, ...(bdayErrors.date ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="Fecha (YYYY-MM-DD)"
                value={bdayDate}
                onChange={(e) => { setBdayDate(e.target.value); setBdayErrors((prev) => ({ ...prev, date: false })) }}
                data-testid="input-bday-date"
              />
              <div data-testid="bday-calendar-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, color: CREAM, opacity: 0.8 }}>
                  Calendario para cumpleaños anuales
                </label>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 500, color: CREAM }}>
                    <input
                      type="radio"
                      name="bday-calendar"
                      value="gregorian"
                      checked={bdayCalendar === 'gregorian'}
                      onChange={() => setBdayCalendar('gregorian')}
                      data-testid="radio-cal-gregorian"
                    />
                    Gregoriano
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 500, color: CREAM }}>
                    <input
                      type="radio"
                      name="bday-calendar"
                      value="hebrew"
                      checked={bdayCalendar === 'hebrew'}
                      onChange={() => setBdayCalendar('hebrew')}
                      data-testid="radio-cal-hebrew"
                    />
                    Hebreo
                  </label>
                </div>
                {bdayCalendar === 'hebrew' && (
                  <p
                    data-testid="bday-cal-hint"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 300, color: SEPIA, lineHeight: 1.5, marginTop: '8px', maxWidth: '480px', margin: '8px 0 0 0' }}
                  >
                    El cumpleaños se mostrará en su fecha hebrea cada año (puede caer en distintas fechas gregorianas)
                  </p>
                )}
              </div>
              <div>
                <button style={primaryBtnStyle} onClick={handleSaveBirthday} data-testid="btn-save-bday">
                  Guardar
                </button>
                <button style={secondaryBtnStyle} onClick={cancelBdayForm} data-testid="btn-cancel-bday">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Respaldo: exportar / importar JSON */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: CREAM, opacity: 0.8 }}>
              Respaldo de cumpleaños (JSON)
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder={'[{ "name": "...", "date": "YYYY-MM-DD", "calendar": "gregorian" }]'}
              value={bdayImportText}
              onChange={(e) => setBdayImportText(e.target.value)}
              data-testid="textarea-bday-import"
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button style={secondaryBtnStyle} onClick={handleExportBirthdays} data-testid="btn-bday-export">
                Exportar
              </button>
              <button style={primaryBtnStyle} onClick={handleImportBirthdays} data-testid="btn-bday-import">
                Importar
              </button>
            </div>
          </div>
        </div>

        {/* ── Bienvenida ── */}
        <div style={sectionStyle} data-testid="section-welcome">
          <div style={sectionTitleStyle}>Bienvenida</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              style={inputStyle}
              placeholder="Autor (ej. Tus hijos)"
              value={welcomeAuthor}
              onChange={(e) => setWelcomeAuthor(e.target.value)}
              data-testid="input-welcome-author"
            />
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder="Mensaje de bienvenida"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              data-testid="textarea-welcome-message"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              data-testid="file-input-photo"
            />
            <button
              style={{ ...primaryBtnStyle, width: 'fit-content' }}
              onClick={() => fileInputRef.current?.click()}
              data-testid="btn-select-photo"
            >
              Seleccionar foto
            </button>
            {welcomePhoto && (
              <div style={{ fontSize: '14px', color: CREAM, opacity: 0.6 }} data-testid="welcome-photo-preview">
                Foto seleccionada ✓
              </div>
            )}
            <button style={{ ...primaryBtnStyle, width: 'fit-content' }} onClick={handleSaveWelcome} data-testid="btn-save-welcome">
              Guardar bienvenida
            </button>
          </div>
        </div>

        {/* ── Fotos ── */}
        <div style={sectionStyle} data-testid="section-photos">
          <div style={sectionTitleStyle}>Fotos</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Estado Service Account */}
            <div style={{ fontSize: '16px' }} data-testid="sa-status">
              {isSAConfigured === null
                ? 'Verificando configuración...'
                : isSAConfigured
                  ? 'SA configurado ✓'
                  : 'SA no configurado — copiá sa-config.json por USB a /Android/data/com.familyframe.app/files/'
              }
            </div>

            {/* Último sync */}
            <div style={{ fontSize: '16px', opacity: 0.75 }} data-testid="last-sync-info">
              {lastSync
                ? `Último sync: ${new Date(lastSync).toLocaleString('es-AR')}`
                : 'Sin sincronización aún'
              }
            </div>

            {/* Fotos en caché */}
            <div style={{ fontSize: '16px', opacity: 0.75 }} data-testid="photo-count">
              {photos.length} fotos en caché
            </div>

            {/* Botón sync */}
            <button
              style={{
                ...primaryBtnStyle,
                width: 'fit-content',
                ...(!isSAConfigured || isSyncing ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
              }}
              onClick={handleForceSync}
              disabled={!isSAConfigured || isSyncing}
              data-testid="btn-force-sync"
            >
              {isSyncing
                ? 'Sincronizando...'
                : isSAConfigured
                  ? 'Forzar sincronización'
                  : 'SA no configurado'
              }
            </button>
          </div>
        </div>

        {/* ── Configuración ── */}
        <div style={sectionStyle} data-testid="section-config">
          <div style={sectionTitleStyle}>Configuración</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Intervalo de rotación */}
            <div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>
                Intervalo de rotación (segundos, 10–86400)
              </div>
              <input
                style={{ ...inputStyle, ...(configErrors.interval ? { border: `2px solid ${AMBER}` } : {}) }}
                type="number"
                min={10}
                max={86400}
                value={intervalInput}
                onChange={(e) => { setIntervalInput(e.target.value); setConfigErrors((prev) => ({ ...prev, interval: false })) }}
                data-testid="input-rotation-interval"
              />
            </div>

            {/* Night mode */}
            <div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>
                Inicio modo noche (HH:MM)
              </div>
              <input
                style={{ ...inputStyle, ...(configErrors.nightStart ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="22:00"
                value={nightStartInput}
                onChange={(e) => { setNightStartInput(e.target.value); setConfigErrors((prev) => ({ ...prev, nightStart: false })) }}
                data-testid="input-night-start"
              />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>
                Fin modo noche (HH:MM)
              </div>
              <input
                style={{ ...inputStyle, ...(configErrors.nightEnd ? { border: `2px solid ${AMBER}` } : {}) }}
                placeholder="07:00"
                value={nightEndInput}
                onChange={(e) => { setNightEndInput(e.target.value); setConfigErrors((prev) => ({ ...prev, nightEnd: false })) }}
                data-testid="input-night-end"
              />
            </div>

            <button style={{ ...primaryBtnStyle, width: 'fit-content' }} onClick={handleSaveConfig} data-testid="btn-save-config">
              Guardar configuración
            </button>

            {/* Cambio de PIN */}
            <div style={{ marginTop: '8px', borderTop: `1px solid rgba(245,240,232,0.1)`, paddingTop: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Cambiar PIN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="password"
                  style={{ ...inputStyle, ...(pinErrors.current ? { border: `2px solid ${AMBER}` } : {}) }}
                  placeholder="PIN actual"
                  value={currentPin}
                  onChange={(e) => { setCurrentPin(e.target.value); setPinErrors((prev) => ({ ...prev, current: false })) }}
                  data-testid="input-current-pin"
                />
                <input
                  type="password"
                  style={{ ...inputStyle, ...(pinErrors.newPin ? { border: `2px solid ${AMBER}` } : {}) }}
                  placeholder="PIN nuevo"
                  value={newPin}
                  onChange={(e) => { setNewPin(e.target.value); setPinErrors((prev) => ({ ...prev, newPin: false, confirm: false })) }}
                  data-testid="input-new-pin"
                />
                <input
                  type="password"
                  style={{ ...inputStyle, ...(pinErrors.confirm ? { border: `2px solid ${AMBER}` } : {}) }}
                  placeholder="Confirmar PIN nuevo"
                  value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value); setPinErrors((prev) => ({ ...prev, confirm: false, newPin: false })) }}
                  data-testid="input-confirm-pin"
                />
                <button style={{ ...primaryBtnStyle, width: 'fit-content' }} onClick={handleSavePin} data-testid="btn-save-pin">
                  Cambiar PIN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sistema ── */}
        <div style={sectionStyle} data-testid="section-system">
          <div style={sectionTitleStyle}>Sistema</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {kioskEnabled ? (
              <button
                style={{ ...primaryBtnStyle, backgroundColor: SEPIA }}
                onClick={handleSuspendKiosk}
                data-testid="btn-suspend-kiosk"
              >
                Suspender kiosk
              </button>
            ) : (
              <button
                style={primaryBtnStyle}
                onClick={handleResumeKiosk}
                data-testid="btn-resume-kiosk"
              >
                Reactivar kiosk
              </button>
            )}
            <button style={{ ...primaryBtnStyle, backgroundColor: SEPIA }} onClick={handleRestart} data-testid="btn-restart">
              Reiniciar app
            </button>
          </div>
        </div>

      </div>

      {/* Toast — P9: siempre montado para permitir fade-out antes de desmontar */}
      {toastData && <Toast message={toastData.message} color={toastData.color} visible={toastVisible} />}
    </div>
  )
}
