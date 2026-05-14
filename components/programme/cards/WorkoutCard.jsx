import { memo } from 'react'

function WorkoutCard({
  workout,
  isOpen,
  isEdit,
  children
}) {

  return (
    <div
      style={{
        background: '#F0F4FF',
        border: '1px solid #C5D0F0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '10px'
      }}
    >
      {children}
    </div>
  )
}

export default memo(WorkoutCard)
