import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: any[]
}

const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  notifications: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    addNotification: (state, action: PayloadAction<any>) => {
      state.notifications.push(action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    }
  }
})

export const { toggleSidebar, setTheme, addNotification, clearNotifications } = uiSlice.actions
export default uiSlice.reducer
