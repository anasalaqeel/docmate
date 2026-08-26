import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Card, CardBody, Link, Divider } from "@heroui/react";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { useBranding } from "../hooks/useBranding";
import { ThemeToggle } from "../components/ui/themeToggle";
import { EnhancedInput } from "../components/ui/enhancedInput";
import { EnhancedButton } from "../components/ui/enhancedButton";
import styles from "../styles/loginPage.module.css";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    general?: string;
  }>({});

  const { login, isAuthenticated, isLoading: authLoading, hasAnyRole } = useAuth();
  const { organizationName, logo } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin";

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!authLoading && isAuthenticated && hasAnyRole(["admin", "superadmin", "moderator"])) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, authLoading, hasAnyRole, navigate]);

  const validateForm = () => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = "Username or Email is required";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const loginSuccess = await login(identifier, password);

      if (loginSuccess) {
        toast.success("Welcome back!", {
          description: "You have been successfully logged in.",
        });
        navigate(from, { replace: true });
      } else {
        toast.error("Login failed", {
          description: "Invalid credentials. Please try again.",
        });
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error("Login error", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle size="sm" showLabel />
      </div>

      <Card className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.brandRow}>
            <img src={logo} alt={`${organizationName} logo`} className={styles.logo} />
            <span className={styles.brandName}>{organizationName}</span>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Login to your {organizationName} dashboard</p>
        </div>

        <CardBody>
          <form onSubmit={handleSubmit} className={styles.form}>
            <EnhancedInput
              type="text"
              label="Username or Email"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              isDisabled={isLoading}
              error={errors.identifier}
              icon={<EnvelopeIcon className="w-4 h-4" />}
              autoComplete="username"
            />

            <EnhancedInput
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isDisabled={isLoading}
              error={errors.password}
              icon={<LockClosedIcon className="w-4 h-4" />}
              endContent={
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon
                      className="w-4 h-4 pointer-events-none"
                      style={{ color: "var(--docmate-text-secondary)" }}
                    />
                  ) : (
                    <EyeIcon
                      className="w-4 h-4 pointer-events-none"
                      style={{ color: "var(--docmate-text-secondary)" }}
                    />
                  )}
                </button>
              }
              autoComplete="current-password"
            />

            <EnhancedButton
              type="submit"
              color="primary"
              className={styles.submitButton}
              isLoading={isLoading}
              loadingText="Signing you in..."
              isDisabled={!identifier.trim() || !password.trim()}
              animate
            >
              Login
            </EnhancedButton>
          </form>

          <Divider className={styles.divider} />

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Don't have an account?{" "}
              <Link href="mailto:admin@example.com" className={styles.link}>
                Contact your administrator
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default LoginPage;
