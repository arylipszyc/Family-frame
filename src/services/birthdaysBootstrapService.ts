import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { adminContentService } from './adminContentService'
import type { Birthday } from '../types/Birthday'

const BOOTSTRAP_FILE = 'birthdays.json'
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

interface RawBirthday {
  name: string
  date: string
  calendar?: string
}

function isValidBirthdayArray(parsed: unknown): parsed is RawBirthday[] {
  if (!Array.isArray(parsed)) return false
  return parsed.every((item) =>
    typeof item === 'object' && item !== null &&
    typeof (item as Record<string, unknown>).name === 'string' &&
    (item as Record<string, string>).name.trim() !== '' &&
    typeof (item as Record<string, unknown>).date === 'string' &&
    DATE_REGEX.test((item as Record<string, string>).date.trim())
  )
}

export const birthdaysBootstrapService = {
  // Si existe birthdays.json en Directory.External, lo importa REEMPLAZANDO
  // la lista actual y borra el archivo (mismo patrón que yiddishPhrasesBootstrapService).
  // Permite editar los cumpleaños en PC + adb push como flujo recurrente.
  // El campo `calendar` es opcional en el archivo (default gregorian); los `id` se generan.
  async bootstrapFromFile(): Promise<void> {
    let raw: string
    try {
      const result = await Filesystem.readFile({
        path:      BOOTSTRAP_FILE,
        directory: Directory.External,
        encoding:  Encoding.UTF8,
      })
      raw = typeof result.data === 'string' ? result.data : await result.data.text()
    } catch {
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.info('[birthdaysBootstrap] birthdays.json malformed, ignoring')
      return
    }

    if (!isValidBirthdayArray(parsed)) {
      console.info('[birthdaysBootstrap] birthdays.json invalid schema, ignoring')
      return
    }

    const normalized: Birthday[] = parsed.map((b) => ({
      id:       crypto.randomUUID(),
      name:     b.name.trim(),
      date:     b.date.trim(),
      calendar: b.calendar === 'hebrew' ? 'hebrew' : 'gregorian',
    }))

    await adminContentService.saveBirthdays(normalized)

    try {
      await Filesystem.deleteFile({ path: BOOTSTRAP_FILE, directory: Directory.External })
    } catch (err) {
      console.warn('[birthdaysBootstrap] failed to delete birthdays.json after bootstrap:', err)
    }
  },
}
