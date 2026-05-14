export const initialState = {
  showDuplicate: false,
  showHistory: false,
  exporting: false,
  archiving: false,
}

export function programmeReducer(state, action) {

  switch(action.type) {

    case 'OPEN_HISTORY':
      return {
        ...state,
        showHistory: true
      }

    case 'CLOSE_HISTORY':
      return {
        ...state,
        showHistory: false
      }

    case 'START_EXPORT':
      return {
        ...state,
        exporting: true
      }

    case 'END_EXPORT':
      return {
        ...state,
        exporting: false
      }

    default:
      return state
  }
}
