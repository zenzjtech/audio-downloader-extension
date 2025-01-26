import React from 'react'

import { useSelector, useDispatch } from 'react-redux'
import { decrement, increment } from './counterSlice'
import { RootState } from '@/store'
import { Button } from '@mui/base'

export function Counter() {
  const count = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch()

  return (
    <div>
      <div>
        <Button          
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
          slotProps={{
            root: {
              className: 'font-medium text-sky-500'
            }
          }}
        >
          Increment
        </Button>
        <span>{count}</span>
        <Button
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
        >
          Decrement
        </Button>
      </div>
    </div>
  )
}