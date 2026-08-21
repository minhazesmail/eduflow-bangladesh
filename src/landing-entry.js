import '../landing.css';
import '../landing-stability.css';
import '../landing-modern.css';

function setMenuState(open) {
  const nav = document.querySelector('.nav-links');
  const button = document.querySelector('.menu-toggle');
  if (!nav || !button) return;
  nav.classList.toggle('open', open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function toggleMenu() {
  const nav = document.querySelector('.nav-links');
  setMenuState(!nav?.classList.contains('open'));
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.menu-toggle')?.addEventListener('click', toggleMenu);
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => setMenuState(false));
  });
});
