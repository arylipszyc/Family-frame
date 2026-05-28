import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAdminContent, mockStorageService, mockSystemSettings, mockPinService, mockDriveAuth, mockDriveSync, mockKiosk } = vi.hoisted(() => ({
  mockAdminContent: {
    saveYiddishPhrases: vi.fn().mockResolvedValue(undefined),
    loadYiddishPhrases: vi.fn().mockResolvedValue(null),
    saveBirthdays:      vi.fn().mockResolvedValue(undefined),
    loadBirthdays:      vi.fn().mockResolvedValue(null),
  },
  mockStorageService: {
    saveWelcomeConfig: vi.fn().mockResolvedValue(undefined),
    loadWelcomeConfig: vi.fn().mockResolvedValue(null),
    saveWelcomePhoto:  vi.fn().mockResolvedValue('welcome/photo.jpg'),
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
  mockDriveAuth: {
    isAuthenticated: vi.fn().mockResolvedValue(false),
  },
  mockDriveSync: {
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
vi.mock('../../services/driveAuthService',      () => ({ driveAuthService:      mockDriveAuth }))
vi.mock('../../services/driveSyncService',      () => ({ driveSyncService:      mockDriveSync }))
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
    birthdays: [{ id: 'b-1', name: 'Abel', date: '1948-03-15', calendar: 'gregorian' }],
    welcomeConfig: { photoPath: '', message: 'Mensaje actual', authorName: 'Tus hijos' },
  })
  useAdminStore.setState({ isAuthenticated: true })
  useDisplayStore.setState({ mode: 'admin', currentPhotoIndex: 0 })
  useSettingsStore.setState({ photoRotationInterval: 30_000, nightModeStart: '22:00', nightModeEnd: '07:00' })
  useSyncStore.setState({ syncStatus: 'idle', lastSync: null, isOnline: false })
  // Default: SA no configurado
  mockDriveAuth.isAuthenticated.mockResolvedValue(false)
  mockDriveSync.sync.mockResolvedValue(0)
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

  it('aplica borde amber en campo requerido vacío al intentar guardar', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-yiddish'))
    fireEvent.click(getByTestId('btn-save-yiddish'))
    // yiddish (letras hebreas) es opcional — el borde amber se aplica a trans/spanish
    const input = getByTestId('input-trans') as HTMLInputElement
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

  it('crear nuevo cumpleaños defaultea calendar a gregorian y oculta hint', () => {
    const { getByTestId, queryByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))
    expect((getByTestId('radio-cal-gregorian') as HTMLInputElement).checked).toBe(true)
    expect((getByTestId('radio-cal-hebrew') as HTMLInputElement).checked).toBe(false)
    expect(queryByTestId('bday-cal-hint')).toBeNull()
  })

  it('seleccionar radio Hebreo muestra el hint condicional', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))
    fireEvent.click(getByTestId('radio-cal-hebrew'))
    expect((getByTestId('radio-cal-hebrew') as HTMLInputElement).checked).toBe(true)
    expect(getByTestId('bday-cal-hint').textContent).toContain('fecha hebrea')
  })

  it('guarda cumpleaños con calendar: hebrew cuando se selecciona el radio', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-add-bday'))
    fireEvent.change(getByTestId('input-bday-name'), { target: { value: 'Haim' } })
    fireEvent.change(getByTestId('input-bday-date'), { target: { value: '1990-05-29' } })
    fireEvent.click(getByTestId('radio-cal-hebrew'))
    fireEvent.click(getByTestId('btn-save-bday'))

    await waitFor(() => expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved[1].name).toBe('Haim')
    expect(saved[1].calendar).toBe('hebrew')
  })

  it('lista muestra símbolo ✡ para cumpleaños hebreos y no para gregorianos', () => {
    useContentStore.setState({
      photos: [],
      yiddishPhrases: [{ yiddish: 'שלום', transliteration: 'Shalom', spanish: 'Paz' }],
      birthdays: [
        { id: 'b-1', name: 'Abel', date: '1948-03-15', calendar: 'gregorian' },
        { id: 'b-2', name: 'Haim', date: '1990-05-29', calendar: 'hebrew' },
      ],
      welcomeConfig: { photoPath: '', message: 'Mensaje actual', authorName: 'Tus hijos' },
    })
    const { getByTestId, queryByTestId } = render(<AdminScreen />)
    expect(queryByTestId('bday-hebrew-symbol-b-1')).toBeNull()
    expect(getByTestId('bday-hebrew-symbol-b-2').textContent).toBe('✡')
  })

  it('precarga radio Hebreo al editar un cumpleaños hebreo', () => {
    useContentStore.setState({
      photos: [],
      yiddishPhrases: [{ yiddish: 'שלום', transliteration: 'Shalom', spanish: 'Paz' }],
      birthdays: [{ id: 'b-h', name: 'Haim', date: '1990-05-29', calendar: 'hebrew' }],
      welcomeConfig: { photoPath: '', message: 'Mensaje actual', authorName: 'Tus hijos' },
    })
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('bday-edit-b-h'))
    expect((getByTestId('radio-cal-hebrew') as HTMLInputElement).checked).toBe(true)
    expect(getByTestId('bday-cal-hint')).toBeDefined()
  })
})

describe('AdminScreen — Cumpleaños: exportar/importar JSON', () => {
  it('exporta los cumpleaños actuales al textarea (sin id)', () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.click(getByTestId('btn-bday-export'))

    const ta = getByTestId('textarea-bday-import') as HTMLTextAreaElement
    const parsed = JSON.parse(ta.value)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({ name: 'Abel', date: '1948-03-15', calendar: 'gregorian' })
    expect(parsed[0].id).toBeUndefined()
  })

  it('importa cumpleaños válidos y los fusiona con id generado', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ name: 'Liliana', date: '1950-07-22', calendar: 'hebrew' }])
    fireEvent.change(getByTestId('textarea-bday-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-bday-import'))

    await waitFor(() => expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved).toHaveLength(2)
    expect(saved[1].name).toBe('Liliana')
    expect(saved[1].calendar).toBe('hebrew')
    expect(saved[1].id).toBeTruthy()
  })

  it('defaultea calendar a gregorian cuando falta en el JSON', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ name: 'Haim', date: '1990-05-29' }])
    fireEvent.change(getByTestId('textarea-bday-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-bday-import'))

    await waitFor(() => expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce())
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved[1].calendar).toBe('gregorian')
  })

  it('no importa duplicados exactos (mismo nombre + fecha + calendario)', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ name: 'Abel', date: '1948-03-15', calendar: 'gregorian' }])
    fireEvent.change(getByTestId('textarea-bday-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-bday-import'))

    await waitFor(() => expect(getByTestId('toast').style.opacity).toBe('1'))
    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
  })

  it('muestra toast de error ante JSON inválido', async () => {
    const { getByTestId } = render(<AdminScreen />)
    fireEvent.change(getByTestId('textarea-bday-import'), { target: { value: 'not-json' } })
    fireEvent.click(getByTestId('btn-bday-import'))

    await waitFor(() => expect(getByTestId('toast').style.opacity).toBe('1'))
    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
  })

  it('rechaza item con fecha en formato inválido', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const json = JSON.stringify([{ name: 'Liliana', date: '22/07/1950', calendar: 'gregorian' }])
    fireEvent.change(getByTestId('textarea-bday-import'), { target: { value: json } })
    fireEvent.click(getByTestId('btn-bday-import'))

    await waitFor(() => expect(getByTestId('toast').style.opacity).toBe('1'))
    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
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

  it('escribe la foto a disco y muestra indicador de foto seleccionada', async () => {
    const { getByTestId, queryByTestId } = render(<AdminScreen />)
    const fileInput = getByTestId('file-input-photo') as HTMLInputElement
    expect(queryByTestId('welcome-photo-preview')).toBeNull()

    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [file] })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(mockStorageService.saveWelcomePhoto).toHaveBeenCalledOnce()
      expect(queryByTestId('welcome-photo-preview')).not.toBeNull()
    })
    expect(mockStorageService.saveWelcomePhoto.mock.calls[0][0]).toBe(file)
  })

  it('acepta fotos > 1 MB (sin límite de tamaño)', async () => {
    const { getByTestId } = render(<AdminScreen />)
    const fileInput = getByTestId('file-input-photo') as HTMLInputElement

    const bigFile = new File(['x'.repeat(1_100_000)], 'grande.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [bigFile] })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(mockStorageService.saveWelcomePhoto).toHaveBeenCalledOnce()
    })
    expect(mockStorageService.saveWelcomePhoto.mock.calls[0][0]).toBe(bigFile)
  })

  it('muestra toast de error si falla la escritura de la foto', async () => {
    mockStorageService.saveWelcomePhoto.mockRejectedValueOnce(new Error('disk full'))
    const { getByTestId } = render(<AdminScreen />)
    const fileInput = getByTestId('file-input-photo') as HTMLInputElement

    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [file] })
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

describe('AdminScreen — Sección Fotos (Drive + SA)', () => {
  it('renderiza la sección Fotos con estado "SA no configurado" por defecto', async () => {
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('section-photos')).toBeDefined()
      expect(getByTestId('sa-status').textContent).toContain('SA no configurado')
    })
  })

  it('muestra "SA configurado ✓" cuando driveAuthService.isAuthenticated() es true', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('sa-status').textContent).toContain('SA configurado')
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

  it('btn-force-sync está deshabilitado con texto correcto cuando SA no configurado', async () => {
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect(getByTestId('sa-status').textContent).toContain('SA no configurado')
    })
    const btn = getByTestId('btn-force-sync') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('SA no configurado')
  })

  it('btn-force-sync se habilita cuando SA está configurado', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect((getByTestId('btn-force-sync') as HTMLButtonElement).disabled).toBe(false)
    })
    expect((getByTestId('btn-force-sync') as HTMLButtonElement).textContent).toContain('Forzar sincronización')
  })

  it('handleForceSync muestra toast "X fotos nuevas" cuando hay fotos nuevas', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    mockDriveSync.sync.mockResolvedValue(3)
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
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    mockDriveSync.sync.mockResolvedValue(0)
    const { getByTestId } = render(<AdminScreen />)
    await waitFor(() => {
      expect((getByTestId('btn-force-sync') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(getByTestId('btn-force-sync'))
    await waitFor(() => {
      expect(getByTestId('toast').textContent).toContain('Sin fotos nuevas')
    })
  })

  it('handleForceSync muestra toast de error cuando sync falla', async () => {
    mockDriveAuth.isAuthenticated.mockResolvedValue(true)
    mockDriveSync.sync.mockRejectedValue(new Error('network error'))
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
