import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthForm type="sign-in" />
    </div>
  );
}
