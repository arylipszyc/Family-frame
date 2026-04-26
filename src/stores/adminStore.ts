import { create } from 'zustand'

interface AdminState {
  isAuthenticated: boolean
  setAuthenticated: (value: boolean) => void
}

export const useAdminStore = create<AdminState>()((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}))
