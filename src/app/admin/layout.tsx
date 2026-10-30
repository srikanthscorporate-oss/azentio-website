import { Suspense } from "react";
import { ScopeBar } from "@/components/scope-bar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><ScopeBar kind="admin" /></Suspense>
      {children}
    </>
  );
}
