import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Linkedin, ArrowRight, ArrowLeft, Mail, Check, 
  Building2, Briefcase, Users, Target, Loader2,
  Chrome
} from 'lucide-react';
import api from '../utils/api';

// Step configurations
const STEPS = {
  AUTH: 'auth',
  OTP: 'otp',
  COMPANY: 'company',
  ROLE: 'role',
  TEAM_SIZE: 'team_size',
  USE_CASE: 'use_case',
};

const ROLES = [
  { id: 'founder', label: 'Founder / CEO', icon: '👑' },
  { id: 'sales', label: 'Sales / BD', icon: '💼' },
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'recruiter', label: 'Recruiter / HR', icon: '🎯' },
  { id: 'consultant', label: 'Consultant', icon: '💡' },
  { id: 'freelancer', label: 'Freelancer', icon: '🚀' },
  { id: 'other', label: 'Other', icon: '✨' },
];

const TEAM_SIZES = [
  { id: 'solo', label: 'Just me', description: 'Solo entrepreneur' },
  { id: '2-10', label: '2-10', description: 'Small team' },
  { id: '11-50', label: '11-50', description: 'Growing company' },
  { id: '51-200', label: '51-200', description: 'Mid-size business' },
  { id: '200+', label: '200+', description: 'Enterprise' },
];

const USE_CASES = [
  { id: 'lead_gen', label: 'Lead Generation', description: 'Find and reach potential customers', icon: Target },
  { id: 'recruiting', label: 'Recruiting', description: 'Source and hire talent', icon: Users },
  { id: 'sales', label: 'Sales Outreach', description: 'Book more meetings', icon: Briefcase },
  { id: 'marketing', label: 'Marketing Research', description: 'Analyze prospects and markets', icon: Building2 },
];

function SignupPage() {
  const navigate = useNavigate();
  const { loginWithOtp, loginWithGoogle, isAuthenticated, token } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(STEPS.AUTH);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Questionnaire data
  const [formData, setFormData] = useState({
    companyName: '',
    role: '',
    teamSize: '',
    useCase: '',
  });

// Redirect if already authenticated AND on auth/otp step (not in questionnaire)
useEffect(() => {
  if (isAuthenticated && (currentStep === STEPS.AUTH || currentStep === STEPS.OTP)) {
    // User is authenticated but just verified OTP, show questionnaire
    setCurrentStep(STEPS.COMPANY);
  }
}, [isAuthenticated, currentStep]);

// Only redirect if authenticated AND onboarding is already completed
  // (don't redirect during signup flow)
  useEffect(() => {
    if (isAuthenticated && currentStep === STEPS.AUTH) {
      // Check if user already completed onboarding
      const user = JSON.parse(localStorage.getItem('brynsa_user') || '{}');
      if (user.onboarding?.completed) {
        navigate('/dashboard');
      } else {
        setCurrentStep(STEPS.COMPANY);
      }
    }
  }, [isAuthenticated]);

  // Handle email submission
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
        setCurrentStep(STEPS.OTP);
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

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp);
    }
  };

  // Handle OTP verification
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
        // Move to questionnaire
        setCurrentStep(STEPS.COMPANY);
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

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // For demo - in production, integrate with Google OAuth
      // This would typically use @react-oauth/google or similar
      const mockGoogleData = {
        email: 'demo@example.com',
        name: 'Demo User',
        picture: null,
        googleId: 'google_' + Date.now()
      };
      
      const result = await loginWithGoogle(mockGoogleData);
      if (result.success) {
        setCurrentStep(STEPS.COMPANY);
      } else {
        setError(result.error || 'Google sign in failed');
      }
    } catch (err) {
      setError('Google sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle questionnaire navigation
  const handleQuestionnaireNext = () => {
    const stepOrder = [STEPS.COMPANY, STEPS.ROLE, STEPS.TEAM_SIZE, STEPS.USE_CASE];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    } else {
      // Complete signup, save onboarding data and redirect
      handleComplete();
    }
  };

  const handleQuestionnaireBack = () => {
    const stepOrder = [STEPS.COMPANY, STEPS.ROLE, STEPS.TEAM_SIZE, STEPS.USE_CASE];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save onboarding data to backend using token from context
      const response = await fetch('https://brynsa-leads-api.onrender.com/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      console.log('Onboarding saved:', data);
      navigate('/dashboard');
    } catch (err) {
      // Even if save fails, redirect to dashboard
      console.error('Failed to save onboarding data:', err);
      navigate('/dashboard');
    }
  };

  // Calculate progress
  const getProgress = () => {
    const steps = [STEPS.AUTH, STEPS.OTP, STEPS.COMPANY, STEPS.ROLE, STEPS.TEAM_SIZE, STEPS.USE_CASE];
    const currentIndex = steps.indexOf(currentStep);
    return Math.round((currentIndex / (steps.length - 1)) * 100);
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

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-dark-400">
                {currentStep === STEPS.AUTH || currentStep === STEPS.OTP ? 'Create account' : 'Tell us about yourself'}
              </span>
              <span className="text-brynsa-400">{getProgress()}%</span>
            </div>
            <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brynsa-500 to-brynsa-400 transition-all duration-500"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="animate-fade-in">
            {/* Step 1: Auth Method Selection */}
            {currentStep === STEPS.AUTH && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Sign up for Brynsa —<br />
                    <span className="text-gradient">free forever</span>
                  </h1>
                  <p className="text-dark-400">
                    Extract unlimited LinkedIn leads with our powerful Chrome extension.
                  </p>
                </div>

                {/* Terms Notice */}
                <div className="p-4 rounded-lg bg-dark-800/50 border border-dark-700">
                  <p className="text-sm text-dark-300">
                    By signing up, I agree to Brynsa's{' '}
                    <a href="#" className="text-brynsa-400 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-brynsa-400 hover:underline">Privacy Policy</a>.
                  </p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
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
                        Sign up for free
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-dark-950 text-dark-500">or</span>
                  </div>
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
                    Sign up with Google
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Login Link */}
                <p className="text-center text-dark-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-brynsa-400 hover:underline">
                    Log in
                  </Link>
                </p>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === STEPS.OTP && (
              <div className="space-y-6">
                <button
                  onClick={() => setCurrentStep(STEPS.AUTH)}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Check your email
                  </h1>
                  <p className="text-dark-400">
                    We sent a verification code to{' '}
                    <span className="text-white">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  {/* OTP Input */}
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
                        Verify email
                        <Check className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Resend OTP */}
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

                {/* Error Message */}
                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Company Name */}
            {currentStep === STEPS.COMPANY && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    What's your company name?
                  </h1>
                  <p className="text-dark-400">
                    This helps us personalize your experience.
                  </p>
                </div>

                <div>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Enter company name"
                      className="input-field pl-12"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleComplete()}
                    className="btn-secondary flex-1"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleQuestionnaireNext}
                    disabled={!formData.companyName}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Role */}
            {currentStep === STEPS.ROLE && (
              <div className="space-y-6">
                <button
                  onClick={handleQuestionnaireBack}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    What's your role?
                  </h1>
                  <p className="text-dark-400">
                    We'll customize Brynsa for your workflow.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setFormData({ ...formData, role: role.id })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.role === role.id
                          ? 'border-brynsa-500 bg-brynsa-500/10'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{role.icon}</span>
                      <span className="font-medium text-white">{role.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleQuestionnaireNext}
                  disabled={!formData.role}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 5: Team Size */}
            {currentStep === STEPS.TEAM_SIZE && (
              <div className="space-y-6">
                <button
                  onClick={handleQuestionnaireBack}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    How big is your team?
                  </h1>
                  <p className="text-dark-400">
                    We'll recommend the right plan for you.
                  </p>
                </div>

                <div className="space-y-3">
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setFormData({ ...formData, teamSize: size.id })}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                        formData.teamSize === size.id
                          ? 'border-brynsa-500 bg-brynsa-500/10'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-white block">{size.label}</span>
                        <span className="text-sm text-dark-400">{size.description}</span>
                      </div>
                      {formData.teamSize === size.id && (
                        <Check className="w-5 h-5 text-brynsa-400" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleQuestionnaireNext}
                  disabled={!formData.teamSize}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 6: Use Case */}
            {currentStep === STEPS.USE_CASE && (
              <div className="space-y-6">
                <button
                  onClick={handleQuestionnaireBack}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    What will you use Brynsa for?
                  </h1>
                  <p className="text-dark-400">
                    We'll set up your workspace accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {USE_CASES.map((useCase) => (
                    <button
                      key={useCase.id}
                      onClick={() => setFormData({ ...formData, useCase: useCase.id })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.useCase === useCase.id
                          ? 'border-brynsa-500 bg-brynsa-500/10'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }`}
                    >
                      <useCase.icon className={`w-6 h-6 mb-3 ${
                        formData.useCase === useCase.id ? 'text-brynsa-400' : 'text-dark-500'
                      }`} />
                      <span className="font-medium text-white block">{useCase.label}</span>
                      <span className="text-sm text-dark-400">{useCase.description}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleComplete}
                  disabled={!formData.useCase || loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Get started
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-dark-900/50 border-l border-dark-800/50 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brynsa-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-brynsa-400/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative max-w-lg text-center space-y-8">
          {/* Feature Card */}
          <div className="card p-8 text-left space-y-4 animate-float">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brynsa-500/20 flex items-center justify-center">
                <Chrome className="w-6 h-6 text-brynsa-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Chrome Extension</h3>
                <p className="text-sm text-dark-400">Extract leads directly from LinkedIn</p>
              </div>
            </div>
            <div className="space-y-2">
              {['Unlimited profile scraping', 'Email enrichment', 'One-click export'].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-brynsa-400" />
                  <span className="text-dark-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '2.5K+', label: 'Active Users' },
              { value: '100K+', label: 'Leads Extracted' },
              { value: '4.9/5', label: 'User Rating' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-dark-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
