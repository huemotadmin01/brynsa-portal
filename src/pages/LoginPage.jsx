import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Linkedin, ArrowRight, ArrowLeft, 
  Loader2
} from 'lucide-react';
import api from '../utils/api';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithOtp, loginWithGoogle, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.sendOtp(email);
      if (response.success) {
        setStep('otp');
        setCountdown(60);
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await loginWithOtp(email, otpString);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const mockGoogleData = {
        email: 'demo@example.com',
        name: 'Demo User',
        picture: null,
        googleId: 'google_' + Date.now()
      };
      
      const result = await loginWithGoogle(mockGoogleData);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Google sign in failed');
      }
    } catch (err) {
      setError('Google sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 mesh-gradient grid-pattern flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brynsa-400 to-brynsa-600 flex items-center justify-center shadow-lg shadow-brynsa-500/25">
              <Linkedin className="w-5 h-5 text-dark-950" />
            </div>
            <span className="text-xl font-bold text-white">Brynsa</span>
          </Link>

          {/* Toggle Tabs */}
          <div className="flex mb-8 p-1 bg-dark-800/50 rounded-lg border border-dark-700">
            <Link
              to="/login"
              className="flex-1 py-2.5 text-center rounded-md text-sm font-medium bg-dark-700 text-white"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="flex-1 py-2.5 text-center rounded-md text-sm font-medium text-dark-400 hover:text-white transition-colors"
            >
              Sign Up
            </Link>
          </div>

          <div className="animate-fade-in">
            {/* Email Step */}
            {step === 'email' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Welcome back
                  </h1>
                  <p className="text-dark-400">
                    Log in to access your leads and continue prospecting.
                  </p>
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="btn-oauth"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Log in with Google
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-dark-950 text-dark-500">Or</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Work Email"
                      className="input-field"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Continue with Email
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-dark-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-brynsa-400 hover:underline">
                      Sign up
                    </Link>
                  </p>
                </div>

                <p className="text-center text-xs text-dark-500 pt-4">
                  2024 All Rights Reserved.{' '}
                  <a href="#" className="hover:text-dark-300">Privacy</a> and{' '}
                  <a href="#" className="hover:text-dark-300">Terms</a>.
                </p>
              </div>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <div className="space-y-6">
                <button
                  onClick={() => setStep('email')}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Enter verification code
                  </h1>
                  <p className="text-dark-400">
                    We sent a 6-digit code to{' '}
                    <span className="text-white">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && index > 0) {
                            const prevInput = document.getElementById(`otp-${index - 1}`);
                            prevInput?.focus();
                          }
                        }}
                        className="w-12 h-14 text-center text-xl font-bold input-field"
                        disabled={loading}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.join('').length !== 6}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Log in
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-dark-500">
                      Resend code in {countdown}s
                    </p>
                  ) : (
                    <button
                      onClick={handleEmailSubmit}
                      disabled={loading}
                      className="text-brynsa-400 hover:underline"
                    >
                      Resend code
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-dark-900/50 border-l border-dark-800/50 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brynsa-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-brynsa-400/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-lg space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Close more deals, faster.
            </h2>
            <p className="text-dark-400">
              Reach the right people with the right message—at the right time.
            </p>
          </div>

          {/* Workflow Card */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brynsa-400">Target high intent prospects</span>
              <button className="text-xs text-dark-400 hover:text-white px-3 py-1 rounded bg-dark-700">
                Learn more
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm text-dark-300 font-medium">Sequence steps • 5</div>
              
              {[
                { day: 'Day 1', action: 'Manual email', time: 'after 10 minutes' },
                { day: 'Day 2', action: 'Phone call', time: 'after 20 minutes' },
                { day: 'Day 3', action: 'Automatic email', time: 'Deliver if no reply in 3 days' },
                { day: 'Day 4', action: 'Phone call', time: 'Schedule if no reply in 10 min' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
                  <div className="w-2 h-2 rounded-full bg-brynsa-400" />
                  <div className="flex-1">
                    <div className="text-sm text-white">{step.day}: {step.action}</div>
                    <div className="text-xs text-dark-500">{step.time}</div>
                  </div>
                </div>
              ))}
              
              <button className="w-full py-2 text-sm text-dark-400 hover:text-white border border-dashed border-dark-700 rounded-lg hover:border-dark-600 transition-colors">
                + Add a step
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
