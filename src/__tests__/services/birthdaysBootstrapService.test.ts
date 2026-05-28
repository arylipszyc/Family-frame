import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile:   vi.fn(),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  },
  Directory: { External: 'EXTERNAL' },
  Encoding:  { UTF8: 'utf8' },
}))

const { mockAdminContent } = vi.hoisted(() => ({
  mockAdminContent: { saveBirthdays: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('../../services/adminContentService', () => ({ adminContentService: mockAdminContent }))

import { Filesystem } from '@capacitor/filesystem'
import { birthdaysBootstrapService } from '../../services/birthdaysBootstrapService'

describe('birthdaysBootstrapService.bootstrapFromFile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('no-op cuando birthdays.json no existe', async () => {
    vi.mocked(Filesystem.readFile).mockRejectedValueOnce(new Error('File does not exist'))

    await birthdaysBootstrapService.bootstrapFromFile()

    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op cuando el JSON está malformado', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({ data: '{not-json' })

    await birthdaysBootstrapService.bootstrapFromFile()

    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
    expect(Filesystem.deleteFile).not.toHaveBeenCalled()
  })

  it('no-op cuando un item no tiene name', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify([{ date: '1990-05-29', calendar: 'gregorian' }]),
    })

    await birthdaysBootstrapService.bootstrapFromFile()

    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
  })

  it('no-op cuando la fecha tiene formato inválido', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify([{ name: 'Liliana', date: '22/07/1950' }]),
    })

    await birthdaysBootstrapService.bootstrapFromFile()

    expect(mockAdminContent.saveBirthdays).not.toHaveBeenCalled()
  })

  it('importa (reemplazando) con id generado y borra el archivo cuando es válido', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify([
        { name: 'Amir', date: '2014-05-13', calendar: 'gregorian' },
        { name: 'Nomi', date: '2011-07-03', calendar: 'hebrew' },
      ]),
    })

    await birthdaysBootstrapService.bootstrapFromFile()

    expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce()
    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved).toHaveLength(2)
    expect(saved[0]).toMatchObject({ name: 'Amir', date: '2014-05-13', calendar: 'gregorian' })
    expect(saved[0].id).toBeTruthy()
    expect(saved[1].calendar).toBe('hebrew')
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path:      'birthdays.json',
      directory: 'EXTERNAL',
    })
  })

  it('defaultea calendar a gregorian cuando falta', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify([{ name: 'Haim', date: '1990-05-29' }]),
    })

    await birthdaysBootstrapService.bootstrapFromFile()

    const saved = mockAdminContent.saveBirthdays.mock.calls[0][0]
    expect(saved[0].calendar).toBe('gregorian')
  })

  it('no lanza cuando deleteFile falla tras un import exitoso', async () => {
    vi.mocked(Filesystem.readFile).mockResolvedValueOnce({
      data: JSON.stringify([{ name: 'Amir', date: '2014-05-13' }]),
    })
    vi.mocked(Filesystem.deleteFile).mockRejectedValueOnce(new Error('Permission denied'))

    await expect(birthdaysBootstrapService.bootstrapFromFile()).resolves.toBeUndefined()

    expect(mockAdminContent.saveBirthdays).toHaveBeenCalledOnce()
  })
})
