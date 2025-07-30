// Next Imports
import type { Metadata } from 'next'

// Component Imports
import Login from '@/views/pages/auth/Login'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account'
}

const LoginPage = () => {
  return <Login />
}

export default LoginPage
