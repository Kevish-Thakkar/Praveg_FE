import { db, newId, type Collection, type Database } from "@/mock/db"
import { notFound, request } from "./api"

type Item<C extends Collection> = Database[C][number]

/** Generic CRUD over a mock collection. Domain services compose this with their own rules. */
export function createCrud<C extends Collection>(collection: C, prefix: string, label: string) {
  const items = () => db[collection] as Item<C>[]
  return {
    list: () => request(() => items()),
    get: (id: string) => request(() => items().find((x) => x.id === id) ?? notFound(label)),
    create: (data: Omit<Item<C>, "id">) =>
      request(() => {
        const created = { ...data, id: newId(prefix) } as Item<C>
        items().unshift(created)
        return created
      }, { mutate: true }),
    update: (id: string, patch: Partial<Item<C>>) =>
      request(() => {
        const idx = items().findIndex((x) => x.id === id)
        if (idx < 0) notFound(label)
        const updated = { ...items()[idx], ...patch } as Item<C>
        items()[idx] = updated
        return updated
      }, { mutate: true }),
    remove: (id: string) =>
      request(() => {
        const list = items()
        const idx = list.findIndex((x) => x.id === id)
        if (idx < 0) notFound(label)
        list.splice(idx, 1)
        return id
      }, { mutate: true }),
  }
}
