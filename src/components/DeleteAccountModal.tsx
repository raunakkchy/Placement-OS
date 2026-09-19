import React, { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, X } from "lucide-react";
import { deleteStudentAccount } from "../services/auth";
import { User } from "../types";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => void;
  user?: User | null;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountDeleted,
  user,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage("Incorrect password. Account was not deleted.");
      return;
    }

    setLoading(true);
    try {
      await deleteStudentAccount(password);
      onAccountDeleted();
    } catch (err: any) {
      // Show exact requirement message if incorrect password or general error
      setErrorMessage(
        err.message?.includes("Incorrect password")
          ? "Incorrect password. Account was not deleted."
          : err.message || "Incorrect password. Account was not deleted."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPassword("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-rose-100">
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3
              id="delete-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              Delete your account?
            </h3>
            <p className="text-xs text-rose-600 font-medium mt-0.5">
              Danger Zone • Permanent Action
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          This action is permanent. All account data associated with your account will be deleted.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label
              htmlFor="delete-confirm-password"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Enter your password to confirm
            </label>
            <div className="relative">
              <input
                id="delete-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-delete"
              type="button"
              disabled={loading}
              onClick={handleClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-delete"
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
