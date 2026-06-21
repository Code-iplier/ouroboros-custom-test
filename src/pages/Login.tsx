import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { setTokens } from "@/utils/tokenStorage";
import { MOCK_USER, createMockTokenResponse } from "@/mocks/data";

export default function Login() {
  const {
    login,
    signup,
    verifyOTP,
    resendOTP,
    resetAuthFlow,
    status,
    error: authError,
    clearError,
  } = useAuth();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration fields
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // OTP Verification fields
  const [otpCode, setOtpCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Clear auth errors when toggling modes or mounting
  useEffect(() => {
    clearError();
  }, [authMode, clearError]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error("Please enter both credentials.");
      return;
    }

    clearError();
    setIsLoading(true);
    try {
      await login({
        username: loginUsername.trim(),
        password: loginPassword,
      });
      toast.success("Successfully logged in!");
    } catch {
      toast.error("Failed to sign in. Verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !regFirstName.trim() ||
      !regLastName.trim() ||
      !regUsername.trim() ||
      !regPhone.trim() ||
      !regPassword.trim()
    ) {
      toast.error("All registration fields are required.");
      return;
    }

    clearError();
    setIsLoading(true);
    try {
      await signup({
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        username: regUsername.trim(),
        phone_number: regPhone.trim(),
        password: regPassword,
      });
      toast.success("Account created successfully! Please verify your phone.");
    } catch {
      toast.error("Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code.");
      return;
    }

    clearError();
    setIsLoading(true);
    try {
      await verifyOTP(otpCode.trim());
      toast.success("OTP verified! Welcome to the dashboard.");
    } catch {
      toast.error("Invalid or expired OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendOTP();
      toast.success("A new simulated OTP has been sent!");
    } catch {
      toast.error("Failed to resend OTP.");
    }
  };

  const handleDemoLogin = () => {
    const tokenResponse = createMockTokenResponse(MOCK_USER);
    setTokens(tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in);
    const base = import.meta.env.BASE_URL || "/";
    window.location.href = `${base}#/dashboard`;
  };

  const isMockMode = import.meta.env.VITE_USE_MOCK_API === "true";

  // If auth state is pending_otp, render the OTP screen
  if (status === "pending_otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm border rounded-xl p-6 bg-card space-y-6 shadow-sm">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Verify Phone Number</h2>
            <p className="text-sm text-muted-foreground">
              Enter any 6-digit code to complete verification (e.g. 123456)
            </p>
          </div>

          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="otp-code" className="text-xs font-semibold text-muted-foreground">
                OTP Code
              </label>
              <input
                id="otp-code"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-center tracking-widest text-lg font-bold"
              />
            </div>

            {authError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full h-9" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
          </form>

          <div className="flex flex-col space-y-2 text-center text-sm">
            <button
              onClick={handleResendOtp}
              type="button"
              className="text-primary hover:underline font-medium"
            >
              Resend verification code
            </button>
            <button
              onClick={resetAuthFlow}
              type="button"
              className="text-muted-foreground hover:underline"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Login or Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border rounded-xl p-6 bg-card space-y-6 shadow-sm">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {authMode === "login" ? "Sign In" : "Create an Account"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {authMode === "login"
              ? "Access your custom application dashboard."
              : "Register to access the dashboard."}
          </p>
        </div>

        {authMode === "login" ? (
          // ============ LOGIN FORM ============
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="login-username"
                className="text-xs font-semibold text-muted-foreground"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Username or Phone"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-muted-foreground"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {authError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full h-9" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className="text-primary hover:underline font-medium"
              >
                Sign Up
              </button>
            </div>
          </form>
        ) : (
          // ============ REGISTRATION FORM ============
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="reg-first-name"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  First Name
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  placeholder="John"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="reg-last-name"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Last Name
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  placeholder="Doe"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-username" className="text-xs font-semibold text-muted-foreground">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="johndoe"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-phone" className="text-xs font-semibold text-muted-foreground">
                Phone Number
              </label>
              <input
                id="reg-phone"
                type="text"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+919876543210"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-password" className="text-xs font-semibold text-muted-foreground">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create a password"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {authError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full h-9" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {isMockMode && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full h-9"
              onClick={handleDemoLogin}
            >
              Continue as Demo User
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
