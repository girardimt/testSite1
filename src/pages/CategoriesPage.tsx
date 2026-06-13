import { useState } from 'react'
import { Tags } from 'lucide-react'
import {
  type Category,
  useCategoryMutations,
} from '../lib/worktrack'
import { PageHeader } from '../components'
import { useReferenceData } from '../app/shared'
import { CategoryDialog } from '../components/categories/CategoryDialog'

export function CategoriesPage() {
  const { categories } = useReferenceData()
  const mutations = useCategoryMutations()
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="page">
      <PageHeader icon={<Tags size={24} />} title="Categories" subtitle="Maintain category flags used throughout WorkTrack." actions={<button type="button" className="primary-button" onClick={() => setOpen(true)}>New Category</button>} />
      <section className="card-grid">
        {categories.map((category) => (
          <article key={category.categoryId} className="card">
            <h2>{category.name}</h2>
            <p>{category.longName}</p>
            <div className="row gap wrap">
              {category.development ? <span className="badge badge-fresh">Development</span> : null}
              {category.capex ? <span className="badge badge-plum">CAPEX</span> : null}
              <span className={category.active ? 'badge badge-leaf' : 'badge badge-neutral'}>{category.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="row gap">
              <button type="button" className="secondary-button" onClick={() => setEditing(category)}>
                Edit
              </button>
              <button type="button" className="secondary-button" onClick={async () => window.confirm(`Delete ${category.name}?`) && mutations.remove.mutateAsync(category.categoryId)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      <CategoryDialog
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (category) => {
          if (editing) {
            await mutations.update.mutateAsync(category)
          } else {
            await mutations.create.mutateAsync(category)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
