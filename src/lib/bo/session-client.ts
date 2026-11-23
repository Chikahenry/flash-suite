/** Clears the secure cookies on the server, then returns to the login screen. */
export async function signOut(reason?: "timeout" | "expired") {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.location.assign(reason ? `/login?reason=${reason}` : "/login");
}
