'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useRouter } from 'next/navigation'

import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'

import { styled, useTheme } from '@mui/material/styles'

import classnames from 'classnames'
import Alert from '@mui/material/Alert'
import Slide from '@mui/material/Slide'

import CustomTextField from '@core/components/mui/TextField'
import Logo from '@components/layout/shared/Logo'

const RegisterIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 600,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

const Register = () => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isPasswordShown2, setIsPasswordShown2] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [otp, setOtp] = useState('')
  const [serverOtp, setServerOtp] = useState('')
  const router = useRouter()
  const theme = useTheme()
  const [otpReferenceNumber, setOtpReferenceNumber] = useState('')
  const [identifier, setIdentifier] = useState('')

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)
  const handleClickShowPassword2 = () => setIsPasswordShown2(show => !show)

  const [showAlert, setShowAlert] = useState<boolean>(false)
  const [showTextAlert, setShowTextAlert] = useState('')
  const [severity, setSeverity] = useState<'success' | 'error'>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const password_confirmation = (form.elements.namedItem('password_confirmation') as HTMLInputElement).value

    if (password !== password_confirmation) {
      setShowAlert(true)
      setShowTextAlert('Password and Confirm Password do not match.')
      setSeverity('error')

      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, password_confirmation })
      })

      const data = await response.json()

      if (response.ok) {
        setShowAlert(true)
        setShowTextAlert('Register Success, Please Confirm OTP')
        setSeverity('success')

        // alert('Register Success, Please Confirm OTP')
        console.log(data)

        const otpRef = data.data.otp_reference_number
        const identifier = email

        // ✅ Redirect ไปหน้า /verify พร้ฃม query params
        router.push(
          `/pages/auth/two-steps-v2?otp_reference_number=${encodeURIComponent(otpRef)}&identifier=${encodeURIComponent(identifier)}`
        )
      } else {
        setShowAlert(true)
        setShowTextAlert(`Register Failed: ${data.message || 'Unknown error'}`)
        setSeverity('error')

        // alert(`Register Failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error:', error)
      setShowAlert(true)
      setShowTextAlert(`Error: ${error.message || error}`)
      setSeverity('error')

      // alert(`Error: ${error.message || error}`)
    }
  }

  // const handleOtpSubmit = async () => {
  //     console.log('Submitting OTP:', {
  //         otp_reference_number: otpReferenceNumber,
  //         otp_code: otp,
  //         identifier: identifier
  //     })
  //     try {
  //         const response = await fetch('/api/confirm-otp', {
  //             method: 'POST',
  //             headers: { 'Content-Type': 'application/json' },
  //             body: JSON.stringify({
  //                 otp_reference_number: otpReferenceNumber,
  //                 otp_code: otp,
  //                 identifier: identifier
  //             })
  //         })
  //         const data = await response.json()
  //         if (response.ok && data.success) {
  //             alert(data.message)  // ✅ โชว์ message จาก API
  //             router.push('/login')
  //         } else {
  //             alert(`OTP Failed: ${data.message || data.error || 'Unknown error'}`)
  //         }
  //         console.log('Response Status:', response.status)
  //         console.log('Response Body:', data)
  //     } catch (error: any) {
  //         console.error('Error:', error)
  //         alert(`Error: ${error.message || error}`)
  //     }
  // }

  // const handleResendOtp = async () => {
  //     console.log('Sending:', {
  //         otp_reference_number: otpReferenceNumber,
  //         identifier: identifier
  //     })
  //     try {
  //         const response = await fetch('/api/resend-otp', {
  //             method: 'POST',
  //             headers: { 'Content-Type': 'application/json' },
  //             body: JSON.stringify({
  //                 otp_reference_number: otpReferenceNumber,
  //                 identifier: identifier
  //             })
  //         })
  //         const data = await response.json()
  //         console.log('API Response:', data)

  //         if (response.ok && data.success) {
  //             alert(data.message)
  //             setOtpReferenceNumber(data.data.otp_reference_number || otpReferenceNumber)
  //         } else {
  //             alert(`Resend OTP Failed: ${data.message || 'Unknown error'}`)
  //         }
  //         console.log('Response Status:', response.status)
  //         console.log('Response Body:', data)

  //     } catch (error: any) {
  //         console.error('Error:', error)
  //         alert(`Error: ${error.message || error}`)
  //     }

  // }

  return (
    <>
      <div className='flex bs-full justify-center'>
        <div className='flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden'>
          <RegisterIllustration
            src='/images/illustrations/characters-with-objects/8.png'
            alt='character-illustration'
            className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })}
          />
        </div>
        <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
          <Link
            href={'/pages/auth/login'}
            className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'
          >
            <Logo />
          </Link>
          <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
            <div className='flex flex-col gap-1'>
              <Typography variant='h4'>Adventure starts here 🚀</Typography>
              <Typography>Make your app management easy and fun!</Typography>
            </div>
            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-6'>
              <CustomTextField autoFocus fullWidth name='name' label='Name' placeholder='Enter your name' />
              <CustomTextField fullWidth name='email' label='Email' placeholder='Enter your email' />
              <CustomTextField fullWidth name='phone' label='Phone' placeholder='Enter your phone number' />
              <CustomTextField
                fullWidth
                name='password'
                label='Password'
                placeholder='············'
                type={isPasswordShown ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton edge='end' onClick={handleClickShowPassword} onMouseDown={e => e.preventDefault()}>
                          <i className={isPasswordShown ? 'bx-hide' : 'bx-show'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <CustomTextField
                fullWidth
                name='password_confirmation'
                label='Confirm Password'
                placeholder='············'
                type={isPasswordShown2 ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton edge='end' onClick={handleClickShowPassword2} onMouseDown={e => e.preventDefault()}>
                          <i className={isPasswordShown2 ? 'bx-hide' : 'bx-show'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <Button fullWidth variant='contained' type='submit'>
                Sign Up
              </Button>
              <div className='flex justify-center items-center flex-wrap gap-2'>
                <Typography>Already have an account?</Typography>
                <Typography component={Link} href={'/pages/auth/login'} color='primary.main'>
                  Sign in instead
                </Typography>
              </div>
            </form>
          </div>
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

      {/* ✅ OTP Dialog */}
      {/* <Dialog open={showOtpDialog}>
                <DialogTitle>Confirm OTP</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin='dense'
                        label='Enter OTP'
                        fullWidth
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleResendOtp}>Resend OTP</Button>
                    <Button onClick={handleOtpSubmit} variant='contained'>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog> */}
    </>
  )
}

export default Register
