import type { Photo } from '../types/Photo'

const FILES = [
  '0ab857ae-8fd6-4067-9969-c0184100d29d.jpg',
  '5c8a2993-43f8-4a38-b01d-1aa8a8cc31b5.jpg',
  '4242c2da-646d-4051-8625-4ea0f4e08691.jpg',
  '08c7c7b8-9847-4940-a9c3-25ad6d012849.jpg',
  '20190114_194132.jpg',
  '20191018_123906(0).jpg',
  '20201014_143859.jpg',
  '20221011_132937.jpg',
  '20230310_171909.jpg',
  '20230407_141838.jpg',
  '20251102_142846.jpg',
  '20251201_001748.jpg',
  '20260221_180544.jpg',
  'DSCN0125.JPG',
  'DSCN0206.JPG',
]

export const testPhotos: Photo[] = FILES.map((file, i) => ({
  id: `dev-${i}`,
  localPath: `/test-photos/${encodeURIComponent(file)}`,
  syncedAt: '2026-05-19T00:00:00Z',
}))
