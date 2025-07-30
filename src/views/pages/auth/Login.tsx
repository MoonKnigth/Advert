'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import {
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  InputAdornment,
  Grid
} from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import classnames from 'classnames'
import Alert from '@mui/material/Alert'
import Slide from '@mui/material/Slide'

// Custom Components
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import themeConfig from '@configs/themeConfig'

const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

const Login = () => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [device_type, setDevice_type] = useState('web')
  const [error, setError] = useState('')

  const [showTextAlert, setShowTextAlert] = useState('')
  const [severity, setSeverity] = useState<'success' | 'error'>()
  const router = useRouter()

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)
  const [showAlert, setShowAlert] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_type: 'web' })
      })

      // ป้องกันกรณี response ไม่ใช่ JSON
      const text = await response.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Invalid JSON response from login')
      }

      // เช็กว่ามี access_token และ refresh_token
      if (response.ok && data?.success && data.data?.access_token && data.data?.refresh_token) {
        const accessToken = data.data.access_token
        const refreshToken = data.data.refresh_token
        const expiresIn = data.data.expires_in
        const refreshTokenExpiresAt = data.data.refresh_token_expires_at

        // ✅ เรียก device info
        const deviceRes = await fetch('/api/auth/device', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        })

        const deviceText = await deviceRes.text()
        let deviceData: any
        try {
          deviceData = JSON.parse(deviceText)
        } catch (e) {
          throw new Error('Invalid JSON response from device API')
        }

        if (!deviceRes.ok || !deviceData?.success) {
          console.warn('Device API warning:', deviceData?.message)
        } else {
          console.log('Device Info:', deviceData.data)
          // 👉 ถ้าต้องการเก็บไว้:
          localStorage.setItem('deviceInfo', JSON.stringify(deviceData.data))
        }

        // ✅ ตั้ง cookies
        Cookies.set('accessToken', accessToken, {
          expires: new Date(Date.now() + expiresIn * 1000)
        })
        Cookies.set('refreshToken', refreshToken, {
          expires: new Date(refreshTokenExpiresAt)
        })

        setShowAlert(true)
        setShowTextAlert('Login สำเร็จ! ยินดีต้อนรับเข้าสู่ระบบ')
        setSeverity('success')

        setTimeout(() => {
          router.push('/dashboard')
          setShowAlert(false)
        }, 3000)
      } else {
        throw new Error(data?.message || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setShowAlert(true)
      setShowTextAlert(error.message || 'Login failed, please try again later.')
      setSeverity('error')
    }
  }

  return (
    <div className='flex justify-center items-center h-screen relative'>
      <div className='flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative max-md:hidden'>
        <LoginIllustration src='/images/illustrations/characters-with-objects/7.png' alt='Login Illustration' />
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-6 w-full'>
          <Link className='absolute top-5 left-6'>
            <Logo />
          </Link>
          <div className='text-center'>
            <Typography variant='h4'>{`Welcome to ${themeConfig.templateName}! 👋🏻`}</Typography>
            <Typography>Please sign-in to your account and start the adventure</Typography>
          </div>
          <form onSubmit={handleLogin} className='flex flex-col gap-5'>
            <TextField
              fullWidth
              label='Email or Username'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='Enter your email or username'
              required
            />
            <TextField
              fullWidth
              label='Password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              type={isPasswordShown ? 'text' : 'password'}
              placeholder='············'
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton edge='end' onClick={handleClickShowPassword} onMouseDown={e => e.preventDefault()}>
                      <i className={classnames({ 'bx-hide': isPasswordShown, 'bx-show': !isPasswordShown })} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            {/* {error && <Typography color='error'>{error}</Typography>} */}
            <div className='flex justify-between items-center'>
              <FormControlLabel control={<Checkbox />} label='Remember me' />
              <Typography className='text-end' href={'/forgot_password'} color='primary.main' component={Link}>
                Forgot password?
              </Typography>
            </div>
            <Button fullWidth variant='contained' type='submit'>
              Login
            </Button>
            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>New on our platform?</Typography>
              <Typography component={Link} href={'/pages/auth/register'} color='primary.main'>
                Create an account
              </Typography>
            </div>
            <Divider className='gap-2 text-textPrimary'>or</Divider>
            <div className='flex justify-center items-center gap-1.5'>
              <IconButton className='text-facebook' size='small'>
                <i className='bx-bxl-facebook-circle' />
              </IconButton>
              <IconButton className='text-twitter' size='small'>
                <i className='bx-bxl-twitter' />
              </IconButton>
              <IconButton className='text-textPrimary' size='small'>
                <i className='bx-bxl-github' />
              </IconButton>
              <IconButton className='text-error' size='small'>
                <i className='bx-bxl-google' />
              </IconButton>
            </div>
          </form>
        </div>
      </div>

      {/* Success Alert - Display after successful login */}
      {showAlert && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'auto',
            maxWidth: '100%'
          }}
        >
          <Slide in={showAlert} {...(showAlert ? { timeout: 500 } : {})}>
            <Alert
              severity={severity}
              action={
                <IconButton size='small' color='inherit' aria-label='close' onClick={() => setShowAlert(false)}>
                  <i className='bx-x' />
                </IconButton>
              }
            >
              {showTextAlert}
            </Alert>
          </Slide>
        </div>
      )}
    </div>
  )
}

export default Login
