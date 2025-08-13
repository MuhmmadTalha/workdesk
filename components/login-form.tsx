"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import RippleGrid from "@/components/ripple-grid";
import DecryptedText from "@/components/decrypted-text";
import { User, Eye, EyeOff, AlertCircle, Lightbulb } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessLoading, setShowSuccessLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
// removed leftover merge marker
  const { theme, setTheme } = useTheme();
  // Use document.documentElement.classList.contains('dark') for instant theme detection
  const [isDark, setIsDark] = useState(false);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);
  // Also update isDark when theme changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        setIsLoading(false);
        setShowSuccessLoading(true);
        // Show success loading screen for 5 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 5000);
      } else {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError("Invalid email or password. Please try again.");
      setIsLoading(false);
    }
  };
  return (
    <div className={`min-h-screen w-full relative overflow-hidden ${isDark ? 'bg-black' : 'bg-gray-100'}`}>
      {/* Ripple Grid Background - Theme adaptive */}
      <div className="fixed inset-0 w-full h-full z-0">
        <RippleGrid
          opacity={isDark ? 0.8 : 0.2}
          gridColor={isDark ? "#8b5cf6" : "#e5e7eb"}
          rippleIntensity={0.04}
          gridSize={8.0}
          gridThickness={12.0}
          fadeDistance={isDark ? 1.2 : 8.0}
          vignetteStrength={1.5}
          glowIntensity={0.08}
          mouseInteraction={true}
          mouseInteractionRadius={1.2}
          key={isDark ? 'dark' : 'light'} // Force re-render on theme change
        />
      </div>

      {/* Main content: Login Card */}
      <div className="relative z-20 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-6">
          <Card className={`backdrop-blur-sm border-2 shadow-xl relative overflow-hidden ${isDark ? 'bg-black/95 border-gray-600 shadow-black/80' : 'bg-white/95 border-gray-300/40 shadow-gray-400/30'}`}>
            <CardHeader className="space-y-4 text-center relative z-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <CardTitle className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${isDark ? 'from-white to-purple-200' : 'from-gray-800 to-purple-600'}`}>Welcome Back</CardTitle>
                <CardDescription className={`text-base ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Sign in to access your workspace</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {error && (
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-red-50/80 border-red-200 text-red-700'}`}>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className={`font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    required
                    className={`h-12 transition-all duration-300 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20 focus:bg-white/15' : 'bg-white/60 border-gray-300/50 text-gray-800 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 focus:bg-white/80'}`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={`font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      className={`p-0 h-auto text-sm ${isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700'}`}
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                    >Forgot password?</Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      required
                      className={`h-12 pr-12 transition-all duration-300 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20 focus:bg-white/15' : 'bg-white/60 border-gray-300/50 text-gray-800 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 focus:bg-white/80'}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-colors ${isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                      onClick={() => setShowPassword(!showPassword)}
                    >{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                  </div>
                </div>
                {showForgotPassword && (
                  <div className={`p-4 rounded-lg border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-700'}`}>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">Password Recovery</p>
                        <p>Please contact your system administrator or development team for password reset assistance.</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-12 font-semibold rounded-lg transition-all duration-300 ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >{isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isDark ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Login"
                )}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
// removed duplicate code block after main component
