import { useState } from "react";
import { Link, useForm } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    post(route("register"), {
      onFinish: () => reset("password", "password_confirmation"),
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-xl bg-[#D95F5F] flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Daftar Akun</CardTitle>
          <CardDescription>Buat akun untuk mulai menggunakan JagaSleman</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input id="name" placeholder="Nama lengkap Anda" className="pl-9" value={data.name} onChange={(e) => setData("name", e.target.value)} required />
              </div>
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="nama@email.com" className="pl-9" value={data.email} onChange={(e) => setData("email", e.target.value)} required />
              </div>
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 karakter" className="pl-9 pr-9" value={data.password} onChange={(e) => setData("password", e.target.value)} required />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Konfirmasi Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input id="confirm" type={showPassword ? "text" : "password"} placeholder="Ulangi password" className="pl-9" value={data.password_confirmation} onChange={(e) => setData("password_confirmation", e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={processing}>
              {processing ? "Memproses..." : "Daftar"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Sudah punya akun?{" "}
            <Link href="/safekey/login" className="text-[#D95F5F] font-medium hover:underline">Masuk di sini</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
