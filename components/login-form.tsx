"use client";

import { useState } from "react";
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
  const { theme } = useTheme();

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
        // Show error for wrong credentials
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError("Invalid email or password. Please try again.");
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen w-full relative overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
      {/* Ripple Grid Background - Theme adaptive */}
      <div className="fixed inset-0 w-full h-full z-0">
        <RippleGrid
          opacity={isDark ? 0.8 : 0.6}
          gridColor="#8b5cf6"
          rippleIntensity={0.04}
          gridSize={8.0}
          gridThickness={12.0}
          fadeDistance={1.2}
          vignetteStrength={isDark ? 1.5 : 1.8}
          glowIntensity={0.08}
          mouseInteraction={true}
          mouseInteractionRadius={1.2}
          key={isDark ? 'dark' : 'light'} // Force re-render on theme change
        />
      </div>

      {/* Dark overlay for better contrast */}
      <div className={`fixed inset-0 z-10 ${isDark ? 'bg-black/80' : 'bg-white/30'}`} />

      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 flex items-center justify-center backdrop-blur-sm bg-black/20"
        >
          <div className={`text-center ${isDark ? 'text-white' : 'text-black'}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`w-16 h-16 border-4 rounded-full mx-auto mb-4 ${
                isDark ? 'border-purple-500/30 border-t-purple-500' : 'border-gray-300 border-t-gray-800'
              }`}
            />
            <DecryptedText
              text="Authenticating..."
              speed={100}
              maxIterations={20}
              sequential={true}
              revealDirection="center"
              animateOn="view"
              className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-black'}`}
            />
          </div>
        </motion.div>
      )}

      {/* Success Loading Overlay - 5 second screen with fast ripples */}
      {showSuccessLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center"
        >
          {/* Fast Ripple Background */}
          <div className="absolute inset-0">
            <RippleGrid
              opacity={0.9}
              gridColor="#8b5cf6"
              rippleIntensity={0.15}
              gridSize={6.0}
              gridThickness={20.0}
              fadeDistance={0.8}
              vignetteStrength={1.2}
              glowIntensity={0.2}
              mouseInteraction={false}
              key="success-loading"
            />
          </div>
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60" />
          
          {/* Success Content */}
          <div className="relative z-10 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 1, times: [0, 0.6, 1] }}
              className="mb-8"
            >
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-white text-4xl"
                >
                  ✓
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-center"
            >
              <DecryptedText
                text="Login Successful!"
                speed={120}
                maxIterations={25}
                sequential={true}
                revealDirection="center"
                animateOn="view"
                className="text-3xl font-bold mb-4"
              />
              <DecryptedText
                text="Redirecting to portal..."
                speed={80}
                maxIterations={15}
                sequential={true}
                revealDirection="start"
                animateOn="view"
                className="text-lg opacity-80"
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <div className="relative z-20 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`max-w-md ${isDark ? 'text-white' : 'text-gray-800'}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex items-center gap-4 mb-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 1, duration: 0.8, type: "spring" }}
                className={`p-3 rounded-full ${isDark ? 'bg-yellow-400/20 border border-yellow-400/30' : 'bg-yellow-100 border border-yellow-300'}`}
              >
                <Lightbulb className={`w-8 h-8 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </motion.div>
              <h1 className={`text-6xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent`}>
                <DecryptedText
                  text="Gen-T AI Solutions"
                  speed={80}
                  maxIterations={15}
                  sequential={true}
                  revealDirection="start"
                  animateOn="view"
                  className="font-bold"
                />
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="mb-8"
            >
              <DecryptedText
                text="Revolutionizing workplace efficiency through advanced AI technology. Streamlining operations, empowering teams, and transforming productivity for the modern enterprise."
                speed={60}
                maxIterations={12}
                sequential={true}
                revealDirection="start"
                animateOn="view"
                className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <Card className={`backdrop-blur-sm border-2 shadow-xl relative overflow-hidden ${
              isDark 
                ? 'bg-black/95 border-gray-600 shadow-black/80' 
                : 'bg-white/95 border-gray-300/40 shadow-gray-400/30'
            }`}>
              
              {/* Enhanced glass shine effect */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent ${
                  isDark ? 'via-white/10' : 'via-white/30'
                }`}
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <CardHeader className="space-y-4 text-center relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center"
                >
                  <User className="w-8 h-8 text-white" />
                </motion.div>
                
                <div className="space-y-2">
                  <CardTitle className={`text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                    isDark ? 'from-white to-purple-200' : 'from-gray-800 to-purple-600'
                  }`}>
                    <DecryptedText
                      text="Welcome Back"
                      speed={80}
                      maxIterations={15}
                      sequential={true}
                      revealDirection="center"
                      animateOn="view"
                      className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    />
                  </CardTitle>
                  <CardDescription className={`text-base ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    <DecryptedText
                      text="Sign in to access your workspace"
                      speed={60}
                      maxIterations={12}
                      sequential={true}
                      revealDirection="start"
                      animateOn="view"
                      className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                    />
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 relative z-10">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border ${
                      isDark 
                        ? 'bg-red-500/10 border-red-500/20 text-red-200'
                        : 'bg-red-50/80 border-red-200 text-red-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className={`font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(""); // Clear error when user types
                      }}
                      required
                      className={`h-12 transition-all duration-300 ${
                        isDark 
                          ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20 focus:bg-white/15'
                          : 'bg-white/60 border-gray-300/50 text-gray-800 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 focus:bg-white/80'
                      }`}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className={`font-medium ${isDark ? 'text-white/90' : 'text-gray-700'}`}>
                        Password
                      </Label>
                      <Button
                        type="button"
                        variant="link"
                        className={`p-0 h-auto text-sm ${
                          isDark ? 'text-white hover:text-gray-300' : 'text-black hover:text-gray-700'
                        }`}
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(""); // Clear error when user types
                        }}
                        required
                        className={`h-12 pr-12 transition-all duration-300 ${
                          isDark 
                            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20 focus:bg-white/15'
                            : 'bg-white/60 border-gray-300/50 text-gray-800 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 focus:bg-white/80'
                        }`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-colors ${
                          isDark 
                            ? 'text-white/60 hover:text-white hover:bg-white/10'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                        }`}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </motion.div>

                  {showForgotPassword && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-lg border ${
                        isDark 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                          : 'bg-amber-50/80 border-amber-200 text-amber-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Password Recovery</p>
                          <p>Please contact your system administrator or development team for password reset assistance.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-12 font-semibold rounded-lg transition-all duration-300 ${
                        isDark 
                          ? 'bg-white text-black hover:bg-gray-100' 
                          : 'bg-black text-white hover:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                            isDark ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'
                          }`} />
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
