import styles from './Logo.module.scss'

interface LogoProps {
  size: 'large' | 'small'
}

/** Gradient wordmark; the "o" is drawn as a ring echoing the ball marker. */
export function Logo({ size }: LogoProps) {
  return (
    <span className={`${styles.logo} ${size === 'large' ? styles.large : styles.small}`}>
      Flux
      <span className={styles.o} aria-hidden="true">
        o
      </span>
      ku
    </span>
  )
}
