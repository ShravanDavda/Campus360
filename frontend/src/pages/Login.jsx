import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function Login() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <header className="max-w-md w-full mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#714B67] bg-opacity-10 text-[#714B67] text-xs font-semibold tracking-wider uppercase mb-3">
          <ShieldCheck className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
          <span>Student Organization System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
          Skyline Student Association
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Sign in to access your dashboard and operational tools
        </p>
      </header>

      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f2f5] mb-4">
            <LogIn className="h-6 w-6 text-[#714B67]" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[#000000] mb-2">Sign In</h2>
          <p className="text-sm text-gray-600 mb-6">
            Authentication portal (Page 01)
          </p>

          <div className="pt-4 border-t border-[#e2e5e9] text-sm text-gray-600">
            Need an account?{' '}
            <Link
              to="/register"
              className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center mt-6 text-xs text-[#8F8F8F]">
        <p>Odoo × LDCE Hackathon 2026 — Skyline Student Association</p>
      </footer>
    </div>
  );
}
