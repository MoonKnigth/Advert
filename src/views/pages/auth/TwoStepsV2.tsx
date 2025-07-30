'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { styled, useTheme } from '@mui/material/styles'
import { OTPInput } from 'input-otp'
import type { SlotProps } from 'input-otp'
import classnames from 'classnames'
import styles from '@/libs/styles/inputOtp.module.css'
import Logo from '@components/layout/shared/Logo'
import Link from '@components/Link'
import { useSettings } from '@core/hooks/useSettings'
import Form from '@components/Form'

const TwoStepsIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 650,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: { maxBlockSize: 550 },
  [theme.breakpoints.down('lg')]: { maxBlockSize: 450 }
}))

const Slot = (props: SlotProps) => (
  <div className={classnames(styles.slot, { [styles.slotActive]: props.isActive })}>
    {props.char !== null && <div>{props.char}</div>}
    {props.hasFakeCaret && <FakeCaret />}
  </div>
)

const FakeCaret = () => (
  <div className={styles.fakeCaret}>
    <div className='w-px h-5 bg-textPrimary' />
  </div>
)

const TwoStepsV2 = () => {
  const [otp, setOtp] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const theme = useTheme()

  // ✅ รับ otp_reference_number + identifier จาก query params (URL)
  const otpReferenceNumber = searchParams.get('otp_reference_number') || ''
  const identifier = searchParams.get('identifier') || ''

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 6) {
      alert('Please enter the 6-digit OTP code.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/confirm-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp_reference_number: otpReferenceNumber,
          otp_code: otp,
          identifier: identifier
        })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        alert(data.message)
        router.push('/pages/auth/login')
      } else {
        alert(`OTP Failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error:', error)
      alert(`Error: ${error.message || error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp_reference_number: otpReferenceNumber,
          identifier: identifier
        })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        alert(data.message)
        // ถ้า API ให้ otp_reference_number ใหม่ ควร redirect พร้อม query ใหม่
      } else {
        alert(`Resend OTP Failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Error:', error)
      alert(`Error: ${error.message || error}`)
    }
  }
  const email = identifier.split('@')
  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          { 'border-ie': settings.skin === 'bordered' }
        )}
      >
        <TwoStepsIllustration
          src='/images/illustrations/characters-with-objects/12.png'
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
            <Typography variant='h4'>Step Verification 💬</Typography>
            <Typography>
              A verification code has been sent to your email. Please check your inbox and enter the code below.
            </Typography>
            <Typography variant='h6'>
              {email[0].slice(0, 5)}******@{email[1]}
            </Typography>
          </div>
          <Form noValidate autoComplete='off' className='flex flex-col gap-6'>
            <div className='flex flex-col gap-2'>
              <Typography>Type your 6 digit security code</Typography>
              <OTPInput
                onChange={val => setOtp(val)}
                value={otp ?? ''}
                maxLength={6}
                containerClassName='group flex items-center'
                render={({ slots }) => (
                  <div className='flex items-center justify-between w-full gap-4'>
                    {slots.map((slot, idx) => (
                      <Slot key={idx} {...slot} />
                    ))}
                  </div>
                )}
              />
            </div>
            <Button fullWidth variant='contained' onClick={handleOtpSubmit} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify my account'}
            </Button>
            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>Didn't get the code?</Typography>
              <Typography color='primary.main' component='span' onClick={handleResendOtp} className='cursor-pointer'>
                Resend
              </Typography>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default TwoStepsV2
