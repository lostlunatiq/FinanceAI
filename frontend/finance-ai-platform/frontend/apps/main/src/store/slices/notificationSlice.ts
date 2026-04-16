import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  createdAt: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0
}

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload)
      if (!action.payload.read) {
        state.unreadCount += 1
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount -= 1
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => { n.read = true })
      state.unreadCount = 0
    },
    clearNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
    }
  }
})

export const { addNotification, markAsRead, markAllAsRead, clearNotifications } = notificationSlice.actions
export default notificationSlice.reducer
