import { useState } from "react";
import { Link, useForm, usePage } from "@inertiajs/react";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

// Icon ornamen background
const PIN_PATH  = "M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z";
const PIN_CIRCLE = { cx: "12", cy: "10", r: "3.5" };
const SHIELD_PATH = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

const pinIcons = [
  { top: "8%",  left: "6%",  size: 40, op: 0.07, rot: -15 },
  { top: "18%", left: "88%", size: 32, op: 0.06, rot: 10  },
  { top: "60%", left: "4%",  size: 28, op: 0.06, rot: 20  },
  { top: "72%", left: "91%", size: 36, op: 0.07, rot: -8  },
  { top: "88%", left: "20%", size: 24, op: 0.05, rot: 5   },
  { top: "35%", left: "93%", size: 30, op: 0.06, rot: -20 },
];

const shieldIcons = [
  { top: "45%", left: "8%",  size: 26, op: 0.06, rot: 12 },
  { top: "25%", left: "82%", size: 22, op: 0.05, rot: -5 },
  { top: "80%", left: "75%", size: 30, op: 0.06, rot: 8  },
];

export default function Login() {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route("login"), {
      onFinish: () => reset("password"),
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-muted/30 relative overflow-hidden">

      {/* ══════════════════════════════
          BACKGROUND LAYERS
      ══════════════════════════════ */}
      <div className="pointer-events-none fixed inset-0 -z-10">

        {/* 1. Base gradient */}
        <div className="absolute inset-0r/30 via-background" />

        {/* 2. Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(var(--primary) / 0.3) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* 3. Vignette fade tepi atas & bawah */}
        <div className="absolute inset-x-0 top-0 h-40 from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 from-background to-transparent" />

        {/* 4. Soft color blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[420px] h-[420px] rounded-full bg-[#D95F5F]/10 blur-[90px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[380px] h-[380px] rounded-full bg-[#D95F5F]/10 blur-[80px]" />
        <div className="absolute top-[40%] left-[30%] w-[260px] h-[260px] rounded-full bg-[#D95F5F]/5 blur-[70px]" />

        {/* 5. MapPin icon ornaments */}
        <div className="absolute inset-0 overflow-hidden">
          {pinIcons.map((s, i) => (
            <svg
              key={i}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="absolute text-[#D95F5F]"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                opacity: s.op,
                transform: "rotate(" + s.rot + "deg)",
              }}
            >
              <circle cx={PIN_CIRCLE.cx} cy={PIN_CIRCLE.cy} r={PIN_CIRCLE.r} />
              <path d={PIN_PATH} />
            </svg>
          ))}

          {/* Shield icon ornaments */}
          {shieldIcons.map((s, i) => (
            <svg
              key={"sh" + i}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="absolute text-[#D95F5F]"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                opacity: s.op,
                transform: "rotate(" + s.rot + "deg)",
              }}
            >
              <path d={SHIELD_PATH} />
            </svg>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          FORM CONTENT
      ══════════════════════════════ */}
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#D95F5F] flex items-center justify-center shadow-lg shadow-[#D95F5F]/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Masuk ke JagaSleman
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Masukkan email dan password Anda
            </p>
          </div>

          {flash?.success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EFF4F8] border border-[#D8E4ED] text-[#D95F5F] text-sm text-left">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{flash.success}</span>
            </div>
          )}
          {flash?.error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{flash.error}</span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
          {/* Garis aksen atas */}
          <div className="h-1 w-full bg-[#D95F5F]" />

          <div className="p-8 space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#D95F5F]" />
                <input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={data.email}
                  onChange={(e) => setData("email", e.target.value)}
                  required
                  className={[
                    "w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-background text-foreground",
                    "border transition-all outline-none placeholder:text-muted-foreground",
                    "focus:ring-2 focus:ring-[#D95F5F]/20 focus:border-[#D95F5F]",
                    errors.email
                      ? "border-destructive bg-destructive/5 focus:ring-destructive/20 focus:border-destructive"
                      : "border-input hover:border-muted-foreground/40",
                  ].join(" ")}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href={route("password.request")}
                  className="text-xs text-[#D95F5F] font-medium hover:underline underline-offset-2"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#D95F5F]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={data.password}
                  onChange={(e) => setData("password", e.target.value)}
                  required
                  className={[
                    "w-full h-11 pl-10 pr-11 rounded-xl text-sm bg-background text-foreground",
                    "border transition-all outline-none placeholder:text-muted-foreground",
                    "focus:ring-2 focus:ring-[#D95F5F]/20 focus:border-[#D95F5F]",
                    errors.password
                      ? "border-destructive bg-destructive/5 focus:ring-destructive/20 focus:border-destructive"
                      : "border-input hover:border-muted-foreground/40",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Ingat saya */}
            <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={data.remember}
                  onChange={(e) => setData("remember", e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={[
                    "w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-150",
                    "flex items-center justify-center",
                    data.remember
                      ? "bg-[#D95F5F] border-[#D95F5F]"
                      : "bg-background border-input group-hover:border-[#D95F5F]/60",
                  ].join(" ")}
                >
                  {data.remember && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path
                        d="M2.5 6L5 8.5 9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground select-none group-hover:text-foreground transition-colors">
                Ingat saya
              </span>
            </label>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={processing}
              className={[
                "w-full h-11 rounded-xl text-sm font-semibold",
                "bg-[#D95F5F] text-white",
                "transition-all duration-200",
                "hover:opacity-90 hover:-translate-y-px",
                "active:translate-y-0 active:opacity-100",
                "focus:outline-none focus:ring-2 focus:ring-[#D95F5F]/30 focus:ring-offset-2",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0",
                "flex items-center justify-center gap-2",
                "shadow-md shadow-[#D95F5F]/20 hover:shadow-lg hover:shadow-[#D95F5F]/25",
              ].join(" ")}
            >
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>

          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/safekey/register"
            className="text-[#D95F5F] font-medium hover:underline underline-offset-2"
          >
            Daftar sekarang
          </Link>
        </p>

      </div>
    </div>
  );
}
