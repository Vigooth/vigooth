import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CpcLayout, cn } from "@vigooth/ui";
import { getPortalUrl } from "@vigooth/config";
import { useAuth } from "../../stores/auth";
import { getVault } from "../../lib/api/client";
import { decryptVault } from "../../lib/crypto/vault";

export function UnlockPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, setMasterPassword, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const portalUrl = getPortalUrl();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("PASSWORD MIN 8 CHARS");
      return;
    }

    setLoading(true);

    try {
      // Try to get existing vault from server
      const response = await getVault();

      // Try to decrypt with master password
      await decryptVault(response.data, password);

      // Success - store master password in memory and go to vault
      setMasterPassword(password);
      navigate("/vault");
    } catch (err) {
      if (err instanceof Error && err.message === "vault not found") {
        // No vault yet - this is a new user, create empty vault
        // Store master password and go to vault
        setMasterPassword(password);
        navigate("/vault");
      } else if (err instanceof Error && err.message === "Invalid master password") {
        setError("INVALID MASTER PASSWORD");
      } else {
        setError("CONNECTION ERROR");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <CpcLayout>
      <div className="h-full flex flex-col p-8">
        <div className="flex justify-between items-start">
          <a
            href={portalUrl}
            className="inline-block mb-4 border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors text-sm w-fit"
          >
            &lt; BACK TO PORTAL
          </a>
          <button
            onClick={handleLogout}
            className="border-2 border-cpc-red-500 text-cpc-red-500 px-4 py-2 hover:bg-cpc-red-500 hover:text-cpc-grey-900 transition-colors text-sm"
          >
            LOGOUT
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="text-cpc-red-500 text-4xl font-bold mb-2">VILOCK</div>
            <div className="text-cpc-cyan-500 text-sm">SECURE PASSWORD VAULT v1.0</div>
            <div className="text-cpc-green-500 text-xs mt-2">Logged in as: {user?.email}</div>
          </div>

          <div className="border-4 border-cpc-green-500 p-8 bg-cpc-grey-900">
            <div className="text-cpc-yellow-500 text-center mb-6">ENTER MASTER PASSWORD</div>

            <form onSubmit={handleUnlock}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-cpc-green-500">&gt;</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="bg-transparent border-2 border-cpc-green-500 text-cpc-green-500 px-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500 w-64"
                  autoFocus
                />
              </div>

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
                {loading ? "DECRYPTING..." : "UNLOCK VAULT"}
              </button>
            </form>

            <div className="text-cpc-green-900 text-xs mt-4 text-center">
              Master password encrypts your vault locally.
              <br />
              We never see your passwords.
            </div>
          </div>

          <div className="text-cpc-cyan-500 text-xs mt-8 text-center animate-pulse-cpc">
            <div>YOUR DATA IS ENCRYPTED LOCALLY</div>
            <div className="mt-1 text-cpc-green-900">Zero-knowledge architecture</div>
          </div>
        </div>
      </div>
    </CpcLayout>
  );
}
