import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CpcLayout, cn } from "@vigooth/ui";
import { getPortalUrl } from "@vigooth/config";
import { login, register } from "../../lib/api/client";
import { useAuth } from "../../stores/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const portalUrl = getPortalUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("ALL FIELDS REQUIRED");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("PASSWORDS DO NOT MATCH");
      return;
    }

    if (password.length < 8) {
      setError("PASSWORD MIN 8 CHARS");
      return;
    }

    setLoading(true);

    try {
      const response = isRegister ? await register(email, password) : await login(email, password);

      authLogin({
        id: response.user.id,
        email: response.user.email,
      });

      navigate("/collection");
    } catch (err) {
      setError(err instanceof Error ? err.message.toUpperCase() : "CONNECTION ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CpcLayout>
      <div className="h-full flex flex-col p-8">
        <a
          href={portalUrl}
          className="inline-block mb-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm w-fit"
        >
          &lt; BACK TO PORTAL
        </a>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="text-cpc-cyan-500 text-4xl font-bold mb-2">MOOVI</div>
            <div className="text-cpc-green-500 text-sm">PERSONAL MOVIE COLLECTION v1.0</div>
          </div>

          <div className="border-4 border-cpc-green-500 p-8 bg-cpc-grey-900 w-full max-w-md">
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className={cn(
                  "flex-1 py-2 border-2 transition-colors",
                  !isRegister
                    ? "border-cpc-yellow-500 text-cpc-yellow-500"
                    : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500",
                )}
              >
                LOGIN
              </button>
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className={cn(
                  "flex-1 py-2 border-2 transition-colors",
                  isRegister
                    ? "border-cpc-yellow-500 text-cpc-yellow-500"
                    : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-green-500 hover:text-cpc-green-500",
                )}
              >
                REGISTER
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="text-cpc-cyan-500 text-sm block mb-1">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="text-cpc-cyan-500 text-sm block mb-1">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500"
                />
              </div>

              {isRegister && (
                <div className="mb-4">
                  <label className="text-cpc-cyan-500 text-sm block mb-1">CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500"
                  />
                </div>
              )}

              {error && (
                <div className="text-cpc-red-500 text-center mb-4 text-sm">ERROR: {error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full border-2 border-cpc-green-500 text-cpc-green-500 py-2 transition-colors",
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-cpc-green-500 hover:text-cpc-grey-900",
                )}
              >
                {loading ? "LOADING..." : isRegister ? "CREATE ACCOUNT" : "LOGIN"}
              </button>
            </form>
          </div>

          <div className="text-cpc-cyan-500 text-xs mt-8 text-center animate-pulse-cpc">
            <div>TRACK, RATE & DISCOVER MOVIES</div>
            <div className="mt-1 text-cpc-green-900">Powered by TMDB & OMDB</div>
          </div>
        </div>
      </div>
    </CpcLayout>
  );
}
