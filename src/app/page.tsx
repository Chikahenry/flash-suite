import { redirect } from "next/navigation";

// The proxy sends signed-out visitors to /login before this runs, so reaching here means signed in.
export default function Home() {
  redirect("/dashboard");
}
