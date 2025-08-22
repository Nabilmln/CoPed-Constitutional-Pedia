import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect langsung ke halaman home
  redirect("/home");
}
