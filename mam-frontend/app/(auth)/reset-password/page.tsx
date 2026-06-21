"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { post } from "@/lib/api";
import { Suspense } from "react";

const schema = z
  .object({
    new_password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) { toast.error("Invalid reset link"); return; }
    setLoading(true);
    try {
      await post("/auth/reset-password", { token, new_password: data.new_password });
      toast.success("Password reset! Please log in.");
      router.push("/login");
    } catch {
      toast.error("Reset failed. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Choose a strong password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" {...register("new_password")} className="mt-1" />
            {errors.new_password && (
              <p className="text-xs text-red-500 mt-1">{errors.new_password.message}</p>
            )}
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" {...register("confirm")} className="mt-1" />
            {errors.confirm && (
              <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
