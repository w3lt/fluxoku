import styles from './Toast.module.scss'

interface ToastProps {
  text: string
}

export function Toast({ text }: ToastProps) {
  return <div className={styles.toast}>{text}</div>
}
