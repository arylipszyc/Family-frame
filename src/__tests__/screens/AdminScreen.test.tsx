import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAdminContent, mockStorageService, mockSystemSettings, mockPinService, mockOAuthService, mockPhotoSync, mockKiosk } = vi.hoisted(() => ({
  mockAdminContent: {
    saveYiddishPhrases: vi.fn().mockResolvedValue(undefined),
    loadYiddishPhrases: vi.fn().mockResolvedValue(null),
    saveBirthdays:      vi.fn().mockResolvedValue(undefined),
    loadBirthdays:      vi.fn().mockResolvedValue(null),
  },
  mockStorageService: {
    saveWelcomeConfig: vi.fn().mockResolvedValue(undefined),
    loadWelcomeConfig: vi.fn().mockResolvedValue(null),
  },
  mockSystemSettings: {
    savePhotoRotationInterval: vi.fn().mockResolvedValue(undefined),
    saveNightModeStart:        vi.fn().mockResolvedValue(undefined),
    saveNightModeEnd:          vi.fn().mockResolvedValue(undefined),
    loadPhotoRotationInterval: vi.fn().mockResolvedValue(null),
    loadNightModeStart:        vi.fn().mockResolvedValue(null),
    loadNightModeEnd:          vi.fn().mockResolvedValue(null),
  },
  mockPinService: {
    verifyPin: vi.fn().mockResolvedValue(true),
    setPin:    vi.fn().mockResolvedValue(undefined),
    initPin:   vi.fn().mockResolvedValue(undefined),
  },
  mockOAuthService: {
    isAuthenticated: vi.fn().mockResolvedValue(false),
    getEmail:        vi.fn().mockResolvedValue(null),
    login:           vi.fn().mockResolvedValue(undefined),
  },
  mockPhotoSync: {
    sync: vi.fn().mockResolvedValue(0),
  },
  mockKiosk: {
    enterKioskMode: vi.fn().mockResolvedValue(undefined),
    exitKioskMode:  vi.fn().mockResolvedValue(undefined),
    isInKioskMode:  vi.fn().mockResolvedValue({ isInKioskMode: true }),
  },
}))

vi.mock('../../services/adminContentService',   () => ({ adminContentService:   mockAdminContent }))
vi.mock('../../services/storageService',        () => ({ storageService:        mockStorageService }))
vi.mock('../../services/systemSettingsService', () => ({ systemSettingsService: mockSystemSettings }))
vi.mock('../../services/pinService',            () => ({ pinService:            mockPinService }))
vi.mock('../../services/oauthService',          () => ({ oauthService:          mockOAuthService }))
vi.mock('../../services/photoSyncService',      () => ({ photoSyncService:      mockPhotoSync }))
vi.mock('@capgo/capacitor-android-kiosk',       () => ({ CapacitorAndroidKiosk: mockKiosk }))

// ── Subjects ───────────────────────────────────────────────────────────────────

import { AdminScreen } from '../../screens/AdminScreen'
import { useContentStore  } from '../../stores/contentStore'
import { useAdminStore    } from '../../stores/adminStore'
import { useDisplayStore  } from '../../stores/displayStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSyncStore     } from '../../stores/syncStore'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  useContentStore.setState({
    photos: [],
    yiddishPhrases: [{ yiddish: 'שלום', transliteration: 'Shalom', spanish: 'Paz' }],
    birthdays: [{ id: 'b-1', name: 'Abel', date: '1948-03-15' }],
    welcomeConfig: { photoPath: '', message: 'Mensaje actual', authorName: 'Tus hijos' },
  })
  useAdminStore.setState({ isAuthenticated: true })
  useDisplayStore.setState({ mode: 'admin', currentPhotoIndex: 0 })
  useSettingsStore.setState({ photoRotationInterval: 30_000, nightModeStart: '22:00', nightModeEnd: '07:00' })
  useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
  // Default: desconectado
  mockOAuthService.isAuthenticated.mockResolvedValue(false)
  mockOAuthService.getEmail.mockResolvedValue(null)
  // Default: kiosk activo
  mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: true })
  mockKiosk.enterKioskMode.mockResolvedValue(undefined)
  mockKiosk.exitKioskMode.mockResolvedValue(undefined)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminScreen — estructura', () => {
  it('renderiza el header con el botón de volver', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('btn-back').textContent).toContain('Volver al frame')
  })

  it('renderiza la sección de Frases Yiddish', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('section-yiddish')).toBeDefined()
  })

  it('renderiza la sección de Cumpleaños', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('section-birthdays')).toBeDefined()
  })
})

describe('AdminScreen — navegación de regreso', () => {
  it('llama setAuthenticated(false) y setMode(kiosk) al volver', async () => {
    vi.useFakeTimers()
    const { getByTestId } = render(<AdminScreen />)

    fireEvent.click(getByTestId('btn-back'))
    vi.advanceTimersByTime(2000)

    expect(useAdminStore.getState().isAuthenticated).toBe(false)
    expect(useDisplayStore.getState().mode).toBe('kiosk')
    vi.useRealTimers()
  })
})

describe('AdminScreen — Frases Yiddish: lista', () => {
  it('muestra las frases existentes con botones Editar y Eliminar', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('yiddish-item-0')).toBeDefined()
    expect(getByTestId('yiddish-edit-0')).toBeDefined()
    expect(getByTestId('yiddish-delete-0')).toBeDefined()
  })
})

describe('AdminScreen — Frases Yiddish: agregar', () => {
  it('abre el formulario al tocar + Agregar frase', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-yiddish'))
    expect(getByTestId('yiddish-form')).toBeDefined()
  })

  it('guarda una frase nueva correctamente', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-yiddish'))

    fireEvent.change(getByTestId('input-yiddish'),  { target: { value: 'לעבן' } })
    fireEvent.change(getByTestId('input-trans'),    { target: { value: 'Lebn' } })
    fireEvent.change(getByTestId('input-spanish'),  { target: { value: 'Vida' } })
    fireEvent.click(getByTestId('btn-save-yiddish'))

    await waitFor(() => {
      expect(mockAdminContent.saveYiddishPhrases).toHaveBeenCalledOnce()
    })
    const saved = mockAdminContent.saveYiddishPhrases.mock.calls[0][0]
    expect(saved).toHaveLength(2)
    expect(saved[1].yiddish).toBe('לעבן')
  })

  it('no guarda cuando hay campos vacíos', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-yiddish'))
    fireEvent.click(getByTestId('btn-save-yiddish'))
    expect(mockAdminContent.saveYiddishPhrases).not.toHaveBeenCalled()
  })

  it('aplica borde amber en campo vacío al intentar guardar', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-yiddish'))
    fireEvent.click(getByTestId('btn-save-yiddish'))
    const input = getByTestId('input-yiddish') as HTMLInputElement
    // jsdom convierte hex a rgb; verificar que hay borde amber (rgb(200,149,108))
    expect(input.style.border).toContain('200, 149, 108')
  })
})

describe('AdminScreen — Frases Yiddish: editar', () => {
  it('precarga los campos al editar una frase existente', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('yiddish-edit-0'))
    expect((getByTestId('input-yiddish') as HTMLInputElement).value).toBe('שלום')
    expect((getByTestId('input-trans')   as HTMLInputElement).value).toBe('Shalom')
    expect((getByTestId('input-spanish') as HTMLInputElement).value).toBe('Paz')
  })
})

describe('AdminScreen — Frases Yiddish: eliminar', () => {
  it('elimina una frase tras confirmar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('yiddish-delete-0'))
    await waitFor(() => expect(mockAdminContent.saveYiddishPhrases).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveYiddishPhrases.mock.calls[0][0]
    expect(saved).toHaveLength(0)
  })

  it('no elimina si el usuario cancela el diálogo', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('yiddish-delete-0'))
    expect(mockAdminContent.saveYiddishPhrases).not.toHaveBeenCalled()
  })
})

describe('AdminScreen — Importar Yiddish', () => {
  it('importa frases válidas y las fusiona con el banco existente', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ yiddish: 'לעבן', transliteration: 'Lebn', spanish: 'Vida' }])
    fireEvent.change(getByTestId('textarea-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-import'))

    await waitFor(() => expect(mockAdminContent.saveYiddishPhrases).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveYiddishPhrases.mock.calls[0][0]
    expect(saved).toHaveLength(2)
  })

  it('no importa duplicados exactos', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ yiddish: 'שלום', transliteration: 'Shalom', spanish: 'Paz' }])
    fireEvent.change(getByTestId('textarea-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-import'))

    await waitFor(() => expect(mockAdminContent.saveYiddishPhrases).not.toHaveBeenCalled())
  })

  it('muestra toast de error ante JSON inválido', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('textarea-import'), { target: { value: 'not-json' } })
    fireEvent.click(getByTestId('btn-import'))

    // P9: toast usa opacity para visibilidad (no conditional render)
    await waitFor(() => {
      expect(getByTestId('toast').style.opacity).toBe('1')
    })
    expect(mockAdminContent.saveYiddishPhrases).not.toHaveBeenCalled()
  })

  it('rechaza JSON sin campo requerido', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ yiddish: 'לעבן', transliteration: 'Lebn' }]) // sin spanish
    fireEvent.change(getByTestId('textarea-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-import'))

    expect(mockAdminContent.saveYiddishPhrases).not.toHaveBeenCalled()
  })
})

describe('AdminScreen — Cumpleaños: CRUD', () => {
  it('muestra cumpleaños existentes con botones Editar y Eliminar', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('bday-item-b-1')).toBeDefined()
    expect(getByTestId('bday-edit-b-1')).toBeDefined()
    expect(getByTestId('bday-delete-b-1')).toBeDefined()
  })

  it('guarda un cumpleaños nuevo con ID generado', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))

    fireEvent.change(getByTestId('input-bday-name'), { target: { value: 'Liliana' } })
    fireEvent.change(getByTestId('input-bday-date'), { target: { value: '1950-07-22' } })
    fireEvent.click(getByTestId('btn-save-bday'))

    await waitFor(() => expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved).toHaveLength(2)
    expect(saved[1].name).toBe('Liliana')
    expect(saved[1].id).toBeTruthy()
  })

  it('no guarda si hay campos vacíos', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))
    fireEvent.click(getByTestId('btn-save-bday'))
    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
  })

  it('no guarda si la fecha no es formato YYYY-MM-DD', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))
    fireEvent.change(getByTestId('input-bday-name'), { target: { value: 'Liliana' } })
    fireEvent.change(getByTestId('input-bday-date'), { target: { value: '22/07/1950' } })
    fireEvent.click(getByTestId('btn-save-bday'))
    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
    const input = getByTestId('input-bday-date') as HTMLInputElement
    expect(input.style.border).toContain('200, 149, 108')
  })

  it('elimina un cumpleaños tras confirmar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('bday-delete-b-1'))
    await waitFor(() => expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved).toHaveLength(0)
  })

  it('precarga campos al editar un cumpleaños', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('bday-edit-b-1'))
    expect((getByTestId('input-bday-name') as HTMLInputElement).value).toBe('Abel')
    expect((getByTestId('input-bday-date') as HTMLInputElement).value).toBe('1948-03-15')
  })
})

describe('AdminScreen — Sección Bienvenida', () => {
  it('renderiza la sección de bienvenida', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('section-welcome')).toBeDefined()
  })

  it('pre-popula los campos con los valores del store', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect((getByTestId('input-welcome-author') as HTMLInputElement).value).toBe('Tus hijos')
    expect((getByTestId('textarea-welcome-message') as HTMLTextAreaElement).value).toBe('Mensaje actual')
  })

  it('guarda la bienvenida correctamente', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-welcome-author'),   { target: { value: 'Abel y Liliana' } })
    fireEvent.change(getByTestId('textarea-welcome-message'), { target: { value: 'Feliz aniversario' } })
    fireEvent.click(getByTestId('btn-save-welcome'))

    await waitFor(() => expect(mockStorageService.saveWelcomeConfig).toHaveBeenCalledOnce())
    const saved = mockStorageService.saveWelcomeConfig.mock.calls[0][0]
    expect(saved.authorName).toBe('Abel y Liliana')
    expect(saved.message).toBe('Feliz aniversario')
  })

  it('lee el archivo y muestra indicador de foto seleccionada', async () => {
    const mockReader = {
      onload:        null as ((e: { target: { result: string } }) => void) | null,
      onerror:       null as (() => void) | null,
      readAsDataURL: vi.fn(function(this: typeof mockReader) {
        this.onload?.({ target: { result: 'data:image/jpeg;base64,abc' } })
      }),
    }
    vi.stubGlobal('FileReader', vi.fn(() => mockReader))

    const { getByTestId, queryByTestId } = render(<AdminScreen />)
    const fileInput = getByTestId('file-input-photo') as HTMLInputElement
    expect(queryByTestId('welcome-photo-preview')).toBeNull()

    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [file] })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(queryByTestId('welcome-photo-preview')).not.toBeNull()
    })
    vi.unstubAllGlobals()
  })

  it('muestra toast si el archivo supera 1 MB', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const fileInput = getByTestId('file-input-photo') as HTMLInputElement

    // Crear un File mock con size > 1MB
    const bigFile = new File(['x'.repeat(1_100_000)], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [bigFile] })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(getByTestId('toast').style.opacity).toBe('1')
    })
  })

  it('guarda con error → muestra toast de error', async () => {
    mockStorageService.saveWelcomeConfig.mockRejectedValueOnce(new Error('fail'))
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-save-welcome'))

    await waitFor(() => {
      expect(getByTestId('toast').style.opacity).toBe('1')
    })
  })
})

describe('AdminScreen — Sección Configuración: rotación y night mode', () => {
  it('renderiza la sección de configuración', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('section-config')).toBeDefined()
  })

  it('pre-popula el intervalo desde el store (30s)', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect((getByTestId('input-rotation-interval') as HTMLInputElement).value).toBe('30')
  })

  it('guarda configuración válida', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-rotation-interval'), { target: { value: '60' } })
    fireEvent.change(getByTestId('input-night-start'), { target: { value: '21:00' } })
    fireEvent.change(getByTestId('input-night-end'),   { target: { value: '08:00' } })
    fireEvent.click(getByTestId('btn-save-config'))

    await waitFor(() => expect(mockSystemSettings.savePhotoRotationInterval).toHaveBeenCalledWith(60_000))
    expect(mockSystemSettings.saveNightModeStart).toHaveBeenCalledWith('21:00')
    expect(mockSystemSettings.saveNightModeEnd).toHaveBeenCalledWith('08:00')
    expect(useSettingsStore.getState().photoRotationInterval).toBe(60_000)
  })

  it('rechaza intervalo fuera de rango (< 10)', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-rotation-interval'), { target: { value: '5' } })
    fireEvent.click(getByTestId('btn-save-config'))
    expect(mockSystemSettings.savePhotoRotationInterval).not.toHaveBeenCalled()
    const input = getByTestId('input-rotation-interval') as HTMLInputElement
    expect(input.style.border).toContain('200, 149, 108')
  })

  it('rechaza formato HH:MM inválido en night mode', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-night-start'), { target: { value: '25:00' } })
    fireEvent.click(getByTestId('btn-save-config'))
    expect(mockSystemSettings.saveNightModeStart).not.toHaveBeenCalled()
    const input = getByTestId('input-night-start') as HTMLInputElement
    expect(input.style.border).toContain('200, 149, 108')
  })

  it('pre-popula los horarios de night mode desde el store', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect((getByTestId('input-night-start') as HTMLInputElement).value).toBe('22:00')
    expect((getByTestId('input-night-end') as HTMLInputElement).value).toBe('07:00')
  })
})

describe('AdminScreen — Sección Configuración: cambio de PIN', () => {
  it('cambia el PIN correctamente cuando todo es válido', async () => {
    mockPinService.verifyPin.mockResolvedValue(true)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '1234' } })
    fireEvent.change(getByTestId('input-new-pin'),     { target: { value: '5678' } })
    fireEvent.change(getByTestId('input-confirm-pin'), { target: { value: '5678' } })
    fireEvent.click(getByTestId('btn-save-pin'))

    await waitFor(() => expect(mockPinService.setPin).toHaveBeenCalledWith('5678'))
    // Campos limpios tras éxito
    expect((getByTestId('input-current-pin') as HTMLInputElement).value).toBe('')
  })

  it('muestra toast de error si PIN actual es incorrecto', async () => {
    mockPinService.verifyPin.mockResolvedValue(false)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '9999' } })
    fireEvent.change(getByTestId('input-new-pin'),     { target: { value: '5678' } })
    fireEvent.change(getByTestId('input-confirm-pin'), { target: { value: '5678' } })
    fireEvent.click(getByTestId('btn-save-pin'))

    await waitFor(() => {
      expect(getByTestId('toast').style.opacity).toBe('1')
    })
    expect(mockPinService.setPin).not.toHaveBeenCalled()
  })

  it('no guarda si los PINes nuevos no coinciden', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '1234' } })
    fireEvent.change(getByTestId('input-new-pin'),     { target: { value: '5678' } })
    fireEvent.change(getByTestId('input-confirm-pin'), { target: { value: '9999' } })
    fireEvent.click(getByTestId('btn-save-pin'))

    expect(mockPinService.verifyPin).not.toHaveBeenCalled()
    const newPinInput = getByTestId('input-new-pin') as HTMLInputElement
    expect(newPinInput.style.border).toContain('200, 149, 108')
  })

  it('no guarda si hay campos vacíos', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-save-pin'))
    expect(mockPinService.verifyPin).not.toHaveBeenCalled()
  })

  it('aplica borde amber en PIN actual incorrecto (respuesta del servidor)', async () => {
    mockPinService.verifyPin.mockResolvedValue(false)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '9999' } })
    fireEvent.change(getByTestId('input-new-pin'),     { target: { value: '5678' } })
    fireEvent.change(getByTestId('input-confirm-pin'), { target: { value: '5678' } })
    fireEvent.click(getByTestId('btn-save-pin'))

    await waitFor(() => {
      const input = getByTestId('input-current-pin') as HTMLInputElement
      expect(input.style.border).toContain('200, 149, 108')
    })
  })

  it('los campos limpian el borde de error al escribir', async () => {
    mockPinService.verifyPin.mockResolvedValue(false)
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '9999' } })
    fireEvent.change(getByTestId('input-new-pin'),     { target: { value: '5678' } })
    fireEvent.change(getByTestId('input-confirm-pin'), { target: { value: '5678' } })
    fireEvent.click(getByTestId('btn-save-pin'))

    await waitFor(() => {
      const input = getByTestId('input-current-pin') as HTMLInputElement
      expect(input.style.border).toContain('200, 149, 108')
    })

    // Al escribir, limpia el error
    fireEvent.change(getByTestId('input-current-pin'), { target: { value: '1234' } })
    const input = getByTestId('input-current-pin') as HTMLInputElement
    expect(input.style.border).not.toContain('200, 149, 108')
  })
})

describe('AdminScreen — Sección Fotos', () => {
  it('renderiza la sección Fotos con estado desconectado por defecto', async () => {
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('section-photos')).toBeDefined()
      expect(getByTestId('oauth-status').textContent).toContain('Desconectado')
    })
  })

  it('muestra estado "Conectado como [email]" cuando está autenticado', async () => {
    mockOAuthService.isAuthenticated.mockResolvedValue(true)
    mockOAuthService.getEmail.mockResolvedValue('ary@gmail.com')
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('oauth-status').textContent).toContain('Conectado como ary@gmail.com')
    })
  })

  it('muestra "Conectado como Google Photos" si está autenticado pero sin email', async () => {
    mockOAuthService.isAuthenticated.mockResolvedValue(true)
    mockOAuthService.getEmail.mockResolvedValue(null)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('oauth-status').textContent).toContain('Conectado como Google Photos')
    })
  })

  it('muestra el conteo de fotos en caché', () => {
    useContentStore.setState((s) => ({ ...s, photos: [
      { id: 'p1', localPath: 'file:///p1.jpg', syncedAt: '' },
      { id: 'p2', localPath: 'file:///p2.jpg', syncedAt: '' },
    ] }))
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('photo-count').textContent).toContain('2 fotos en caché')
  })

  it('btn-force-sync está deshabilitado con texto correcto cuando no autenticado', () => {
    const { getByTestId } = render(<AdminScreen />)
    const btn = getByTestId('btn-force-sync') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('Conectar Google Photos primero')
  })

  it('handleConnectOAuth conecta y actualiza estado OAuth', async () => {
    mockOAuthService.login.mockResolvedValue(undefined)
    mockOAuthService.getEmail.mockResolvedValue('ary@gmail.com')
    const { getByTestId } = render(<AdminScreen />)
    // Wait for initial auth check to complete
    await waitFor(() => {
      expect(getByTestId('btn-connect-oauth')).toBeDefined()
    })
    fireEvent.click(getByTestId('btn-connect-oauth'))
    await waitFor(() => {
      expect(getByTestId('oauth-status').textContent).toContain('Conectado como ary@gmail.com')
    })
  })

  it('handleForceSync muestra toast "X fotos nuevas" cuando hay fotos nuevas', async () => {
    mockOAuthService.isAuthenticated.mockResolvedValue(true)
    mockOAuthService.getEmail.mockResolvedValue('ary@gmail.com')
    mockPhotoSync.sync.mockResolvedValue(3)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect((getByTestId('btn-force-sync') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(getByTestId('btn-force-sync'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('3 fotos nuevas sincronizadas')
    })
  })

  it('handleForceSync muestra "Sin fotos nuevas" cuando no hay cambios', async () => {
    mockOAuthService.isAuthenticated.mockResolvedValue(true)
    mockOAuthService.getEmail.mockResolvedValue('ary@gmail.com')
    mockPhotoSync.sync.mockResolvedValue(0)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect((getByTestId('btn-force-sync') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(getByTestId('btn-force-sync'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('Sin fotos nuevas')
    })
  })

  it('handleForceSync muestra toast de error en sepia cuando sync falla', async () => {
    mockOAuthService.isAuthenticated.mockResolvedValue(true)
    mockOAuthService.getEmail.mockResolvedValue('ary@gmail.com')
    mockPhotoSync.sync.mockRejectedValue(new Error('network error'))
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect((getByTestId('btn-force-sync') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(getByTestId('btn-force-sync'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('Sin conexión — usando caché')
    })
  })
})

describe('AdminScreen — Sección Sistema', () => {
  it('renderiza la sección de sistema', () => {
    const { getByTestId } = render(<AdminScreen />)
    expect(getByTestId('section-system')).toBeDefined()
  })

  it('llama window.location.reload al confirmar restart', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-restart'))
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('no llama reload si el usuario cancela', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-restart'))
    expect(reloadMock).not.toHaveBeenCalled()
  })
})

describe('AdminScreen — Sección Sistema: kiosk suspend/resume (AC5)', () => {
  it('muestra btn-suspend-kiosk cuando kiosk está activo (default)', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: true })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('btn-suspend-kiosk')).toBeDefined()
    })
  })

  it('suspender kiosk llama exitKioskMode y cambia botón a Reactivar', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: true })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('btn-suspend-kiosk')).toBeDefined()
    })
    fireEvent.click(getByTestId('btn-suspend-kiosk'))
    await waitFor(() => {
      expect(mockKiosk.exitKioskMode).toHaveBeenCalledOnce()
      expect(getByTestId('btn-resume-kiosk')).toBeDefined()
    })
  })

  it('muestra btn-resume-kiosk cuando kiosk está suspendido', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: false })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('btn-resume-kiosk')).toBeDefined()
    })
  })

  it('reactivar kiosk llama enterKioskMode y cambia botón a Suspender', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: false })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('btn-resume-kiosk')).toBeDefined()
    })
    fireEvent.click(getByTestId('btn-resume-kiosk'))
    await waitFor(() => {
      expect(mockKiosk.enterKioskMode).toHaveBeenCalledWith({ restoreAfterReboot: true, relaunch: true })
      expect(getByTestId('btn-suspend-kiosk')).toBeDefined()
    })
  })

  it('muestra toast amber al suspender kiosk', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: true })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => getByTestId('btn-suspend-kiosk'))
    fireEvent.click(getByTestId('btn-suspend-kiosk'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('Kiosk suspendido')
    })
  })

  it('muestra toast amber al reactivar kiosk', async () => {
    mockKiosk.isInKioskMode.mockResolvedValue({ isInKioskMode: false })
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => getByTestId('btn-resume-kiosk'))
    fireEvent.click(getByTestId('btn-resume-kiosk'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('Kiosk reactivado')
    })
  })
})
