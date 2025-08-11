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
  // ...existing code...
  return (
    <div className={
      `min-h-screen w-full relative overflow-hidden ${isDark ? 'bg-black' : 'bg-gray-100'}`
    }>
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
      {/* ...rest of the code for overlays and main content... */}
      {/* ...existing code... */}
    </div>
  );
}
// removed duplicate code block after main component
