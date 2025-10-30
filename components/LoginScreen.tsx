
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import ForgotPasswordModal from './ForgotPasswordModal';

// NEW: Export the AppIcon component for use in other files.
export const AppIcon: React.FC<{className?: string}> = ({ className = "h-12 w-12" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`text-slate-700 ${className}`} viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
  </svg>
);


const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // NEW: State for password visibility
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const persistence = rememberMe 
          ? firebase.auth.Auth.Persistence.LOCAL 
          : firebase.auth.Auth.Persistence.SESSION;
      
      await auth.setPersistence(persistence);
      
      await auth.signInWithEmailAndPassword(email, password);

      if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
      } else {
          localStorage.removeItem('rememberedEmail');
      }

    // FIX: Added a missing opening curly brace to the catch block to fix a syntax error.
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <>
      <div 
        className="relative min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop')" }}
      >
        {/* Background branding for Desktop */}
        <div className="absolute inset-0 p-8 hidden lg:block pointer-events-none">
          {/* Top Left Logo */}
          <div className="absolute top-8 left-8">
              <AppIcon className="h-16 w-16 text-white" />
          </div>

          {/* Bottom Left Name & Tagline */}
          <div className="absolute bottom-8 left-8 text-white max-w-lg">
              <h1 className="text-5xl font-bold whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                <span className="text-yellow-400">T</span>ravel & <span className="text-yellow-400">E</span>xpense <span className="text-yellow-400">M</span>anagement <span className="text-yellow-400">S</span>ystem
              </h1>
              <p className="text-lg mt-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Streamline your business expenses with ease and intelligence.</p>
          </div>
          
          {/* Bottom Right Copyright */}
           <div className="absolute bottom-8 right-8 text-white text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              &copy; {new Date().getFullYear()} CA. Deepak Bholusaria. All Rights Reserved.
            </div>
        </div>

        {/* Login Box container */}
        <div className="min-h-screen flex items-center justify-center lg:justify-end p-4 lg:my-12">
          {/* Floating Login Box */}
          <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 lg:mr-16 xl:mr-24">
              
              {/* Logo at the top-left (mobile only) */}
              <div className="flex justify-start mb-6 lg:hidden">
                  <AppIcon className="h-10 w-10" />
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Log in to your account</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back! Please enter your details.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
                      placeholder="Enter your password"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.303 3.546A10.048 10.048 0 01.458 10c1.274 4.057 5.022 7 9.542 7 1.655 0 3.22-.321 4.697-.904l-1.745-1.745z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                  
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                            Remember me
                        </label>
                    </div>
                    <div className="text-sm">
                        <button
                            type="button"
                            onClick={() => setIsForgotPasswordModalOpen(true)}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Forgot password?
                        </button>
                    </div>
                </div>

                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isLoading ? 'Signing In...' : 'Log In'}
                  </button>
                </div>
              </form>
              
              {/* Application branding at the bottom (mobile only) */}
              <div className="mt-8 text-center lg:hidden">
                <h3 className="text-lg font-semibold text-slate-700">Travel & Expense Management System</h3>
                <p className="text-sm text-slate-500 mt-1">Streamline your business expenses with ease and intelligence.</p>
              </div>

              <div className="mt-6 space-y-4 text-center">
                  <p className="text-xs text-gray-600">
                      By continuing, you agree to our{' '}
                      <a href="#privacy" onClick={(e) => { e.preventDefault(); window.location.hash = 'privacy'; }} className="underline font-medium text-gray-800 hover:text-black">
                          privacy policy
                      </a>{' '}
                      and{' '}
                      <a href="#terms" onClick={(e) => { e.preventDefault(); window.location.hash = 'terms'; }} className="underline font-medium text-gray-800 hover:text-black">
                          terms of use
                      </a>
                      .
                  </p>
                   {/* Copyright for mobile */}
                  <p className="text-xs text-gray-500 lg:hidden">
                    &copy; {new Date().getFullYear()} CA. Deepak Bholusaria. All Rights Reserved.
                  </p>
              </div>
          </div>
        </div>
      </div>
      {isForgotPasswordModalOpen && (
        <ForgotPasswordModal onClose={() => setIsForgotPasswordModalOpen(false)} />
      )}
    </>
  );
};

export default LoginScreen;
