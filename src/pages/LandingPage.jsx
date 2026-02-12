import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Zap, Users, BarChart3, Shield, Chrome, Star } from 'lucide-react';
import RivvraLogo from '../components/BrynsaLogo';

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 mesh-gradient grid-pattern relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-rivvra-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rivvra-400/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rivvra-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-dark-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center shadow-lg shadow-rivvra-500/25 group-hover:shadow-rivvra-500/40 transition-shadow">
                <RivvraLogo className="w-7 h-7" />
              </div>
              <span className="text-xl font-bold text-white">Rivvra</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-dark-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-dark-300 hover:text-white transition-colors">Pricing</a>
              <Link to="/login" className="text-dark-300 hover:text-white transition-colors">Log in</Link>
              <Link to="/signup" className="btn-primary flex items-center gap-2">
                Sign up free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Link to="/signup" className="md:hidden btn-primary text-sm py-2">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rivvra-500/10 border border-rivvra-500/20">
                <Zap className="w-4 h-4 text-rivvra-400" />
                <span className="text-sm text-rivvra-300">Free LinkedIn Contact Extraction</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">Extract contacts from</span>
                <br />
                <span className="text-gradient">LinkedIn — free forever</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-dark-300 max-w-xl">
                Find, extract, and reach your ideal prospects directly from LinkedIn. 
                Unlimited scraping, AI-powered outreach, and CRM integration in one powerful extension.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
                  Start extracting contacts
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#demo" 
                  className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2"
                >
                  <Chrome className="w-5 h-5" />
                  Install Extension
                </a>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-rivvra-400 text-rivvra-400" />
                  ))}
                </div>
                <span className="text-dark-400">
                  Trusted by <span className="text-white font-semibold">2,500+</span> sales teams
                </span>
              </div>
            </div>

            {/* Right - Product Preview Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-rivvra-500/20 to-rivvra-400/10 rounded-3xl blur-2xl" />
              
              {/* Card */}
              <div className="relative card p-8 space-y-6 animate-float">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rivvra-400 uppercase tracking-wider">Contact Preview</span>
                  <span className="px-3 py-1 rounded-full bg-rivvra-500/20 text-rivvra-300 text-xs font-medium">
                    97% fit
                  </span>
                </div>

                {/* Profile Card */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">MS</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">Michael Smith</h3>
                    <p className="text-dark-400 text-sm">Director of Marketing @ Olain</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 rounded bg-dark-700/50 text-dark-300 text-xs">SaaS</span>
                      <span className="px-2 py-1 rounded bg-dark-700/50 text-dark-300 text-xs">B2B</span>
                      <span className="px-2 py-1 rounded bg-dark-700/50 text-dark-300 text-xs">500+ emp</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-dark-700/50" />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="px-4 py-2.5 rounded-lg bg-rivvra-500 text-dark-950 font-medium text-sm hover:bg-rivvra-400 transition-colors">
                    Generate Email
                  </button>
                  <button className="px-4 py-2.5 rounded-lg bg-dark-700/50 text-white font-medium text-sm border border-dark-600 hover:bg-dark-700 transition-colors">
                    Export to CRM
                  </button>
                </div>

                {/* Extracted Info Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Email</span>
                    <span className="text-rivvra-300">m.smith@olain.com ✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Phone</span>
                    <span className="text-dark-300">+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">LinkedIn</span>
                    <span className="text-dark-300">linkedin.com/in/msmith</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-24 border-t border-dark-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Everything you need to grow your pipeline
              </h2>
              <p className="text-dark-400 text-lg max-w-2xl mx-auto">
                From contact extraction to personalized outreach, Rivvra gives you the tools to find and convert more prospects.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Linkedin,
                  title: 'LinkedIn Scraping',
                  description: 'Extract unlimited profiles with one click. Names, emails, companies, and more.',
                  highlight: 'FREE'
                },
                {
                  icon: Zap,
                  title: 'AI Email Generation',
                  description: 'Generate personalized cold emails that get responses using GPT-4.',
                  highlight: 'PRO'
                },
                {
                  icon: Users,
                  title: 'CRM Integration',
                  description: 'Export contacts directly to Odoo, HubSpot, or your favorite CRM.',
                  highlight: 'PRO'
                },
                {
                  icon: BarChart3,
                  title: 'Email Verification',
                  description: 'Verify emails in real-time to improve deliverability.',
                  highlight: 'FREE'
                },
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="card p-6 hover:border-rivvra-500/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-rivvra-500/10 flex items-center justify-center group-hover:bg-rivvra-500/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-rivvra-400" />
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      feature.highlight === 'FREE' 
                        ? 'bg-rivvra-500/20 text-rivvra-300' 
                        : 'bg-dark-700 text-dark-300'
                    }`}>
                      {feature.highlight}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-dark-400 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="card p-12 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-rivvra-500/10 via-rivvra-400/5 to-rivvra-500/10" />
              
              <div className="relative space-y-6">
                <Shield className="w-12 h-12 text-rivvra-400 mx-auto" />
                <h2 className="text-3xl lg:text-4xl font-bold text-white">
                  Ready to supercharge your outreach?
                </h2>
                <p className="text-dark-400 text-lg max-w-xl mx-auto">
                  Join thousands of sales professionals who use Rivvra to find and connect with their ideal customers.
                </p>
                <Link to="/signup" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2">
                  Get started for free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-dark-500 text-sm">No credit card required</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-800/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center">
                <RivvraLogo className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white">Rivvra</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-dark-400">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-dark-500 text-sm">&copy; {new Date().getFullYear()} Rivvra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
