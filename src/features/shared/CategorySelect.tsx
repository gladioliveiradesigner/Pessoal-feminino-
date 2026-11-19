import { useTable } from '@/hooks/useData'
import { Select } from '@/components/ui/field'
import { forwardRef, type SelectHTMLAttributes } from 'react'

export const CategorySelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => {
  const { data: cats = [] } = useTable('categories')
  return (
    <Select ref={ref} {...props}>
      <option value="">Sem categoria</option>
      {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  )
})
CategorySelect.displayName = 'CategorySelect'

export function FreqSelectOptions() {
  return (
    <>
      <option value="">Não se repete</option>
      <option value="daily">Diariamente</option>
      <option value="weekly">Semanalmente</option>
      <option value="monthly">Mensalmente</option>
      <option value="yearly">Anualmente</option>
    </>
  )
}
