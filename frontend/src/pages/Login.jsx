import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // NOTE: Login API contract is not yet provided.
    // In accordance with instructions, no API request or mock authentication is implemented.
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header / Branding */}
      <header className="max-w-md w-full mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#714B67] bg-opacity-10 text-[#714B67] text-xs font-semibold tracking-wider uppercase mb-3">
          <ShieldCheck className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
          <span>CAMPUS360</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
          Skyline Student Association
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Unified operating platform for campus leadership & operations
        </p>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="mb-6 border-b border-[#e2e5e9] pb-4">
            <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
              <LogIn className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Address */}
            <div>
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="e.g. maanas@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" required className="mb-0">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-base font-semibold"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Registration Link Footer */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              Register
            </Link>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="max-w-md w-full mx-auto text-center mt-6 text-xs text-[#8F8F8F]">
        <p>Odoo × LDCE Hackathon 2026 — Skyline Student Association</p>
      </footer>
    </div>
  );
}
