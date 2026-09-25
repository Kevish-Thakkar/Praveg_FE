import { db } from "@/mock/db"
import type { Currency, Organization, ProjectType, User } from "@/types/domain"
import { ApiError, request } from "./api"
import { createCrud } from "./crud"
import { logActivity } from "./activity.service"

export const organizationService = createCrud("organizations", "org", "Organization")
const projectTypeCrud = createCrud("projectTypes", "pt", "Project type")
export const projectTypeService = {
  ...projectTypeCrud,
  remove: (id: string) =>
    request(() => {
      if (db.projects.some((p) => p.serviceId === id)) throw new ApiError("This project type is used by projects and cannot be deleted", 409)
      db.projectTypes = db.projectTypes.filter((t) => t.id !== id)
      return id
    }, { mutate: true }),
}

export const currencyService = {
  list: () => request<Currency[]>(() => db.currencies),
  create: (c: Currency) =>
    request(() => {
      if (db.currencies.some((x) => x.code === c.code)) throw new ApiError(`${c.code} already exists`, 409)
      db.currencies.push(c)
      return c
    }, { mutate: true }),
  remove: (code: string) =>
    request(() => {
      const cur = db.currencies.find((x) => x.code === code)
      if (cur?.isBase) throw new ApiError("The base currency cannot be removed", 409)
      db.currencies = db.currencies.filter((x) => x.code !== code)
      return code
    }, { mutate: true }),
}

const userCrud = createCrud("users", "usr", "User")
export const userService = {
  ...userCrud,
  invite: (data: Pick<User, "name" | "email" | "role" | "organizationId" | "phone">) =>
    request(() => {
      const domain = data.email.split("@")[1]?.toLowerCase()
      const isAdmin = data.role === "Super Admin"
      if (isAdmin && !db.settings.allowedAdminDomains.includes(domain ?? "")) {
        throw new ApiError(`Administrative accounts must use an organization domain (${db.settings.allowedAdminDomains.join(", ")})`, 422)
      }
      if (db.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) throw new ApiError("A user with this email already exists", 409)
      const user: User = { ...data, id: `usr_${Date.now().toString(36)}`, status: "Invited", lastActiveAt: null }
      db.users.push(user)
      logActivity("User", user.id, null, `Invited ${user.name} as ${user.role}`)
      return user
    }, { mutate: true }),
}

export const skillService = {
  list: () => request<string[]>(() => [...db.skills].sort((a, b) => a.localeCompare(b))),
  add: (skill: string) =>
    request(() => {
      const s = skill.trim()
      if (s.length < 2) throw new ApiError("Skill name is too short", 422)
      if (!db.skills.some((x) => x.toLowerCase() === s.toLowerCase())) db.skills.push(s)
      return s
    }, { mutate: true }),
}

export const settingsService = {
  get: () => request(() => db.settings),
  update: (patch: Partial<typeof db.settings>) =>
    request(() => {
      db.settings = { ...db.settings, ...patch }
      logActivity("Settings", "settings", null, "Updated security settings")
      return db.settings
    }, { mutate: true }),
}

export type { Organization, ProjectType }
