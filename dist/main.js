// Content and navigation remain available without JavaScript.
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const hero = document.querySelector('.hero');
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'motion-toggle';
toggle.setAttribute('aria-label', '动态效果');
let enabled = !reducedMotion.matches;
let heroVisible = true;
const animations = new Set();
function updateMotion() {
  root.classList.toggle('motion-on', enabled);
  root.classList.toggle('motion-paused', !heroVisible || document.hidden);
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.textContent = enabled ? '动态效果：开' : '动态效果：关';
  if (!enabled || document.hidden) {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }
}
toggle.addEventListener('click', () => { enabled = !enabled; updateMotion(); });
document.querySelector('.hero-bottom')?.append(toggle);
reducedMotion.addEventListener('change', event => { enabled = !event.matches; updateMotion(); });
document.addEventListener('visibilitychange', updateMotion);
updateMotion();

// Animate once on entry without ever hiding content in the base stylesheet.
function enter(element, delay = 0) {
  if (!enabled || document.hidden || typeof element.animate !== 'function') return;
  const animation = element.animate([
    { opacity: 0.3, transform: 'translateY(22px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 700, delay, easing: 'cubic-bezier(.16,1,.3,1)' });
  animations.add(animation);
  animation.onfinish = () => animations.delete(animation);
}
document.querySelectorAll('.hero-copy > *').forEach((element, index) => enter(element, index * 75));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      enter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.section-label, .about-content, .section-heading, .directions article, .project, .destination, .contact > div').forEach(element => observer.observe(element));
  const heroObserver = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateMotion();
  });
  if (hero) heroObserver.observe(hero);
}
