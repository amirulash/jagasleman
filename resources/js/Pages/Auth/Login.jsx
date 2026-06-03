import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, Lock, Mail, Shield } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <main className="jaga-login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            <Head title="Masuk" />

            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#EEF8F6] via-[#F8FAFC] to-[#FFF7ED]" />
                <div className="absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-[#0FA3A0]/15 blur-3xl" />
                <div className="absolute bottom-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-[#F2A20B]/14 blur-3xl" />
                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F47B52]/8 blur-3xl" />
            </div>

            <section className="w-full max-w-md">
                <div className="mb-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#07324A] text-white shadow-xl shadow-[#07324A]/20">
                        <Shield className="h-8 w-8" />
                    </div>
                    <h1 className="mt-4 text-2xl font-black tracking-tight text-[#07324A]">Masuk JagaSleman</h1>
                </div>

                <form onSubmit={submit} className="overflow-hidden rounded-[1.6rem] border border-[#BDE7E1] bg-white/95 shadow-2xl shadow-[#07324A]/10 backdrop-blur">
                    <div className="h-1.5 bg-gradient-to-r from-[#07324A] via-[#0FA3A0] to-[#F47B52]" />
                    <div className="space-y-5 p-7">
                        {status && (
                            <div className="flex items-start gap-2 rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] px-4 py-3 text-sm font-semibold text-[#0F766E]">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{status}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-black text-[#07324A]">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="h-11 w-full rounded-xl border border-[#BDE7E1] bg-white pl-10 pr-4 text-sm font-semibold text-[#07324A] outline-none transition placeholder:text-slate-400 focus:border-[#0FA3A0] focus:ring-4 focus:ring-[#0FA3A0]/15"
                                    autoComplete="username"
                                    autoFocus
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                            </div>
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-black text-[#07324A]">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="h-11 w-full rounded-xl border border-[#BDE7E1] bg-white pl-10 pr-4 text-sm font-semibold text-[#07324A] outline-none transition placeholder:text-slate-400 focus:border-[#0FA3A0] focus:ring-4 focus:ring-[#0FA3A0]/15"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                            </div>
                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                                Ingat saya
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-bold text-[#0F766E] underline-offset-4 hover:underline"
                                >
                                    Lupa password?
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#07324A] text-sm font-black text-white shadow-lg shadow-[#07324A]/20 transition hover:-translate-y-0.5 hover:bg-[#0F766E] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? 'Memproses...' : 'Masuk'}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
