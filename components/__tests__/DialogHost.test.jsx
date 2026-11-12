import { render, screen, fireEvent, act } from '@testing-library/react'
import DialogHost from '../ui/DialogHost'
import { confirmDialog, notifyError } from '../../lib/dialogs'

it('affiche une erreur et une confirmation, et renvoie la réponse', async () => {
  render(<DialogHost />)
  act(() => notifyError('Enregistrement impossible'))
  expect(screen.getByRole('alert').textContent).toBe('Enregistrement impossible')

  let answer
  act(() => {
    confirmDialog('Supprimer cette séance ?', { confirmLabel: 'Supprimer', danger: true }).then(
      (v) => (answer = v)
    )
  })
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByText('Supprimer')))
  expect(answer).toBe(true)
  expect(screen.queryByRole('alertdialog')).toBeNull()

  act(() => {
    confirmDialog('Autre ?').then((v) => (answer = v))
  })
  await act(async () => fireEvent.click(screen.getByText('Annuler')))
  expect(answer).toBe(false)
})
