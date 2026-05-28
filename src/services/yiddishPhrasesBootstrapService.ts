import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { adminContentService } from './adminContentService'
import type { YiddishPhrase } from '../types/YiddishPhrase'

const BOOTSTRAP_FILE = 'yiddish-phrases.json'

function isValidPhraseArray(parsed: unknown): parsed is YiddishPhrase[] {
  if (!Array.isArray(parsed)) return false
  return parsed.every((item) =>
    typeof item === 'object' && item !== null &&
    typeof (item as Record<string, unknown>).yiddish === 'string' &&
    typeof (item as Record<string, unknown>).transliteration === 'string' &&
    typeof (item as Record<string, unknown>).spanish === 'string' &&
    (item as Record<string, string>).transliteration.trim() !== '' &&
    (item as Record<string, string>).spanish.trim() !== ''
  )
}

export const yiddishPhrasesBootstrapService = {
  // Si existe yiddish-phrases.json en Directory.External, lo importa REEMPLAZANDO
  // la lista actual y borra el archivo (mismo patrón que folderConfigService).
  // Permite editar las frases en PC + adb push como flujo recurrente.
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
      console.info('[yiddishPhrasesBootstrap] yiddish-phrases.json malformed, ignoring')
      return
    }

    if (!isValidPhraseArray(parsed)) {
      console.info('[yiddishPhrasesBootstrap] yiddish-phrases.json invalid schema, ignoring')
      return
    }

    const normalized: YiddishPhrase[] = parsed.map((p) => ({
      yiddish:         p.yiddish.trim(),
      transliteration: p.transliteration.trim(),
      spanish:         p.spanish.trim(),
    }))

    await adminContentService.saveYiddishPhrases(normalized)

    try {
      await Filesystem.deleteFile({ path: BOOTSTRAP_FILE, directory: Directory.External })
    } catch (err) {
      console.warn('[yiddishPhrasesBootstrap] failed to delete yiddish-phrases.json after bootstrap:', err)
    }
  },
}
