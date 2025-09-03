'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Slide from '@mui/material/Slide'
import { styled, useTheme } from '@mui/material/styles'

import classnames from 'classnames'

import CustomTextField from '@core/components/mui/TextField'
import Logo from '@components/layout/shared/Logo'

const RegisterIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 600,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: { maxBlockSize: 550 },
  [theme.breakpoints.down('lg')]: { maxBlockSize: 450 }
}))

// ---------- Validation helpers ----------
const nameRegex = /^[\p{L}\p{M} _-]+$/u // อนุญาตตัวอักษรทุกภาษา + วรรค/_/-
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ // รูปแบบอีเมลทั่วไป
const phoneRegex = /^[0-9]{10}$/ // ตัวเลขล้วน 8–15 หลัก

type Errors = {
  name?: string
  email?: string
  phone?: string
  password?: string
  password_confirmation?: string
}

const Register = () => {
  const theme = useTheme()
  const router = useRouter()

  // UI states
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isPasswordShown2, setIsPasswordShown2] = useState(false)

  // Snackbar/Alert
  const [showAlert, setShowAlert] = useState(false)
  const [severity, setSeverity] = useState<'success' | 'error'>('success')
  const [showTextAlert, setShowTextAlert] = useState('')

  // Form values
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: ''
  })

  const [errors, setErrors] = useState<Errors>({})

  const handleClickShowPassword = () => setIsPasswordShown(s => !s)
  const handleClickShowPassword2 = () => setIsPasswordShown2(s => !s)

  const setSnack = (type: 'success' | 'error', msg: string) => {
    setSeverity(type)
    setShowTextAlert(msg)
    setShowAlert(true)
  }

  const validateField = (key: keyof typeof values, val: string, ctx?: { password?: string }) => {
    const v = val.trim()

    switch (key) {
      case 'name':
        if (!v) return 'กรุณากรอกชื่อ'
        if (!nameRegex.test(v)) return 'อนุญาตเฉพาะตัวอักษรทุกภาษา และช่องว่าง/_/- เท่านั้น'

        return
      case 'email':
        if (!v) return 'กรุณากรอกอีเมล'
        if (!emailRegex.test(v)) return 'รูปแบบอีเมลไม่ถูกต้อง'

        return
      case 'phone':
        if (!v) return 'กรุณากรอกเบอร์โทร'
        if (!phoneRegex.test(v)) return 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก'

        return
      case 'password':
        if (!v) return 'กรุณากรอกรหัสผ่าน'
        if (v.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'

        return
      case 'password_confirmation':
        if (!v) return 'กรุณายืนยันรหัสผ่าน'
        if (v.length < 8) return 'ต้องมีอย่างน้อย 8 ตัวอักษร'
        if (ctx?.password && v !== ctx.password) return 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'

        return
      default:
        return
    }
  }

  const validateAll = (vals = values) => {
    const next: Errors = {
      name: validateField('name', vals.name),
      email: validateField('email', vals.email),
      phone: validateField('phone', vals.phone),
      password: validateField('password', vals.password),
      password_confirmation: validateField('password_confirmation', vals.password_confirmation, {
        password: vals.password
      })
    }

    setErrors(next)
    const firstErr = Object.values(next).find(Boolean)

    return { ok: !firstErr, firstErr }
  }

  const handleChange = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = key === 'phone' ? e.target.value.replace(/[^\d]/g, '') : e.target.value
    const nextVals = { ...values, [key]: val }

    setValues(nextVals)

    // validate-on-change แบบเบา ๆ
    setErrors(prev => ({
      ...prev,
      [key]:
        key === 'password_confirmation'
          ? validateField(key, val, { password: nextVals.password })
          : validateField(key, val)
    }))
  }

  const handleBlur = (key: keyof typeof values) => (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value

    setErrors(prev => ({
      ...prev,
      [key]:
        key === 'password_confirmation'
          ? validateField(key, val, { password: values.password })
          : validateField(key, val)
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { ok, firstErr } = validateAll()

    if (!ok) {
      setSnack('error', String(firstErr))

      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          password: values.password,
          password_confirmation: values.password_confirmation
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSnack('success', 'สมัครสมาชิกสำเร็จ โปรดยืนยัน OTP')
        const otpRef = data.data?.otp_reference_number
        const identifier = values.email.trim()

        // ไปหน้า verify
        router.push(
          `/pages/auth/two-steps-v2?otp_reference_number=${encodeURIComponent(otpRef)}&identifier=${encodeURIComponent(
            identifier
          )}`
        )
      } else {
        setSnack('error', `Register Failed: ${data.message || 'Unknown error'}`)
      }
    } catch (err: any) {
      setSnack('error', `Error: ${err?.message || err}`)
    }
  }

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
              {/* NAME */}
              <CustomTextField
                autoFocus
                fullWidth
                name='name'
                type='text'
                label='Name'
                placeholder='Enter your name'
                value={values.name}
                onChange={handleChange('name')}
                onBlur={handleBlur('name')}
                error={Boolean(errors.name)}
                helperText={errors.name}
                inputProps={{ spellCheck: false }}
              />

              {/* EMAIL */}
              <CustomTextField
                fullWidth
                name='email'
                type='email'
                label='Email'
                placeholder='Enter your email'
                value={values.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                error={Boolean(errors.email)}
                helperText={errors.email}
                inputProps={{ spellCheck: false }}
              />

              {/* PHONE */}
              <CustomTextField
                fullWidth
                name='phone'
                label='Phone'
                type='number'
                placeholder='Enter your phone number'
                value={values.phone}
                onChange={handleChange('phone')}
                onBlur={handleBlur('phone')}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                slotProps={{
                  input: {
                    inputProps: {
                      inputMode: 'numeric',
                      pattern: '[0-9]*'
                    },
                    onKeyDown: (e: any) => {
                      // กัน e, +, -, ., E
                      if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault()
                    }
                  }
                }}
              />

              {/* PASSWORD */}
              <CustomTextField
                fullWidth
                name='password'
                label='Password'
                placeholder='············'
                type={isPasswordShown ? 'text' : 'password'}
                value={values.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                error={Boolean(errors.password)}
                helperText={errors.password}
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

              {/* CONFIRM PASSWORD */}
              <CustomTextField
                fullWidth
                name='password_confirmation'
                label='Confirm Password'
                placeholder='············'
                type={isPasswordShown2 ? 'text' : 'password'}
                value={values.password_confirmation}
                onChange={handleChange('password_confirmation')}
                onBlur={handleBlur('password_confirmation')}
                error={Boolean(errors.password_confirmation)}
                helperText={errors.password_confirmation}
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

              <Button
                fullWidth
                variant='contained'
                type='submit'
                disabled={
                  !values.name ||
                  !values.email ||
                  !values.phone ||
                  !values.password ||
                  !values.password_confirmation ||
                  Object.values(errors).some(Boolean)
                }
              >
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

      {/* Snackbar + Alert */}
      <Snackbar
        open={showAlert}
        onClose={() => setShowAlert(false)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert onClose={() => setShowAlert(false)} severity={severity} variant='filled' sx={{ width: '100%' }}>
          {showTextAlert}
        </Alert>
      </Snackbar>
    </>
  )
}

export default Register
