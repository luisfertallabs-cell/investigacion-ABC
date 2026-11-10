import type { ReactNode } from 'react'

export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <img className="mark" src="./icon-512.png" alt="" />
        <div>
          <h2>Investigación quirúrgica, en un solo lugar.</h2>
          <p>Residencias de Cirugía del Centro Médico ABC</p>
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-box">
          <img className="logo" src="./logo.png" alt="Centro Médico ABC" />
          {children}
        </div>
      </div>
    </div>
  )
}
