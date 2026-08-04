import './style.css'

document.documentElement.classList.remove('no-js')

const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle')
const mobileMenu = document.querySelector<HTMLDivElement>('#mobile-menu')
const iconMenu = document.querySelector<SVGElement>('#icon-menu')
const iconClose = document.querySelector<SVGElement>('#icon-close')

menuToggle?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('hidden')
  iconMenu?.classList.toggle('hidden')
  iconClose?.classList.toggle('hidden')
})

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden')
    iconMenu?.classList.remove('hidden')
    iconClose?.classList.add('hidden')
  })
})

// Slide-up-on-scroll reveal for anything tagged .reveal.
const revealEls = document.querySelectorAll<HTMLElement>('.reveal')

if ('IntersectionObserver' in window && revealEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  )
  revealEls.forEach((el) => observer.observe(el))
} else {
  // No IntersectionObserver support — just show everything.
  revealEls.forEach((el) => el.classList.add('is-visible'))
}
