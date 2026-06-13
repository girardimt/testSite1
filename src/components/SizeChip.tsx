import { sizeColor, type Size } from '../lib/worktrack'

export const SizeChip = ({ size }: { size: Size }) => (
  <span className={sizeColor(size)}>{size}</span>
)
