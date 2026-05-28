import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useDisplayStore } from './stores/displayStore'
import { useContentStore } from './stores/contentStore'
import { storageService } from './services/storageService'
import { photoCacheService } from './services/photoCacheService'
import { pinService } from './services/pinService'
import { adminContentService } from './services/adminContentService'
import { systemSettingsService } from './services/systemSettingsService'
import { folderConfigService } from './services/folderConfigService'
import { saConfigService } from './services/saConfigService'
import { yiddishPhrasesBootstrapService } from './services/yiddishPhrasesBootstrapService'
import { birthdaysBootstrapService } from './services/birthdaysBootstrapService'
import { useSettingsStore } from './stores/settingsStore'
import { useSync } from './hooks/useSync'
import { KioskScreen } from './screens/KioskScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { AdminScreen } from './screens/AdminScreen'

// Dark init screen — matches WelcomeScreen background so there's no flash
const initScreenStyle: CSSProperties = {
  position:        'fixed',
  inset:           0,
  backgroundColor: '#1A1210',
}

function App() {
  const mode             = useDisplayStore((state) => state.mode)
  const setWelcomeConfig         = useContentStore((state) => state.setWelcomeConfig)
  const setPhotos                = useContentStore((state) => state.setPhotos)
  const setYiddishPhrases        = useContentStore((state) => state.setYiddishPhrases)
  const setBirthdays             = useContentStore((state) => state.setBirthdays)
  const setPhotoRotationInterval = useSettingsStore((s) => s.setPhotoRotationInterval)
  const setNightModeStart        = useSettingsStore((s) => s.setNightModeStart)
  const setNightModeEnd          = useSettingsStore((s) => s.setNightModeEnd)
  const setYiddishScript         = useSettingsStore((s) => s.setYiddishScript)
  const [initialized, setInitialized] = useState(false)

  // Network listener + auto-sync (registered once for app lifetime)
  useSync()

  useEffect(() => {
    // Bootstrap de yiddish-phrases.json y birthdays.json ANTES del load — escriben en
    // las mismas Preferences keys que loadYiddishPhrases/loadBirthdays leen. Si los
    // dejáramos en el Promise.all de abajo habría race condition.
    Promise.all([
      yiddishPhrasesBootstrapService.bootstrapFromFile(),
      birthdaysBootstrapService.bootstrapFromFile(),
    ]).finally(() => {
    Promise.all([
      storageService.loadWelcomeConfig(),
      photoCacheService.initialize().then(() => photoCacheService.getAllCachedPhotos()),
      pinService.initPin(),
      adminContentService.loadYiddishPhrases(),
      adminContentService.loadBirthdays(),
      systemSettingsService.loadPhotoRotationInterval(),
      systemSettingsService.loadNightModeStart(),
      systemSettingsService.loadNightModeEnd(),
      systemSettingsService.loadYiddishScript(),
      folderConfigService.bootstrapFromFile(),
      saConfigService.bootstrapFromFile(),
    ]).then(([config, photos, , phrases, birthdays, rotInterval, nightStart, nightEnd, yidScript]) => {
      if (config)       setWelcomeConfig(config)
      if (photos.length > 0) setPhotos(photos)
      if (phrases)      setYiddishPhrases(phrases)
      if (birthdays)    setBirthdays(birthdays)
      if (rotInterval !== null) setPhotoRotationInterval(rotInterval)
      if (nightStart)   setNightModeStart(nightStart)
      if (nightEnd)     setNightModeEnd(nightEnd)
      if (yidScript)    setYiddishScript(yidScript)
      setInitialized(true)
    }).catch(() => {
      // P1: fallo de init → mostrar app con defaults en lugar de pantalla negra permanente
      setInitialized(true)
    })
    })  // ← cierra .finally del bootstrap
  }, [setWelcomeConfig, setPhotos, setYiddishPhrases, setBirthdays,
      setPhotoRotationInterval, setNightModeStart, setNightModeEnd, setYiddishScript])

  if (!initialized) return <div style={initScreenStyle} />

  if (mode === 'kiosk') return <KioskScreen />
  if (mode === 'admin') return <AdminScreen />
  return <WelcomeScreen />
}

export default App
