import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { notificationService, reminderService, type ReminderInput } from "@/services"
import type { Reminder } from "@/types/domain"

export const useReminders = () => useQuery({ queryKey: [...qk.reminders], queryFn: reminderService.list })
export const useCreateReminder = () =>
  useAppMutation({ mutationFn: (i: ReminderInput) => reminderService.create(i), invalidate: [qk.reminders, qk.dashboard], success: "Reminder created" })
export const useSetReminderStatus = () =>
  useAppMutation({
    mutationFn: ({ id, status }: { id: string; status: Reminder["status"] }) => reminderService.setStatus(id, status),
    invalidate: [qk.reminders, qk.dashboard],
    success: (_r, v) => (v.status === "Done" ? "Reminder marked as done" : "Reminder reopened"),
  })
export const useDeleteReminder = () =>
  useAppMutation({ mutationFn: (id: string) => reminderService.remove(id), invalidate: [qk.reminders, qk.dashboard], success: "Reminder deleted" })

export const useNotifications = () =>
  useQuery({ queryKey: [...qk.notifications], queryFn: notificationService.list, refetchInterval: 60_000 })
export const useMarkNotificationRead = () =>
  useAppMutation({ mutationFn: (id: string) => notificationService.markRead(id), invalidate: [qk.notifications] })
export const useMarkAllNotificationsRead = () =>
  useAppMutation({ mutationFn: () => notificationService.markAllRead(), invalidate: [qk.notifications], success: "All notifications marked as read" })
