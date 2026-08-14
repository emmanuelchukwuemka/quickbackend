const form = document.querySelector<HTMLFormElement>('#delete-form')
const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')
const errorEl = document.querySelector<HTMLParagraphElement>('#form-error')
const successEl = document.querySelector<HTMLDivElement>('#form-success')

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!submitBtn || !errorEl) return

  const data = new FormData(form)
  const contact = String(data.get('contact') || '').trim()
  const role = String(data.get('role') || 'passenger')
  const reason = String(data.get('reason') || '').trim()

  if (!contact) return

  errorEl.classList.add('hidden')
  submitBtn.disabled = true
  submitBtn.textContent = 'Submitting…'

  try {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_ref: contact,
        user_role: role,
        subject: 'Account Deletion Request',
        message: `Please delete this account and all associated data.\nContact: ${contact}\nAccount type: ${role}${reason ? `\nReason: ${reason}` : ''}`,
      }),
    })

    if (!res.ok) throw new Error('Request failed')

    form.classList.add('hidden')
    successEl?.classList.remove('hidden')
  } catch {
    errorEl.textContent = 'Something went wrong submitting your request. Please try again or email support@quickdrop.ng directly.'
    errorEl.classList.remove('hidden')
    submitBtn.disabled = false
    submitBtn.textContent = 'Request Account Deletion'
  }
})
