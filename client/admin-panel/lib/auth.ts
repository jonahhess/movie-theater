import { cookies } from "next/headers";
import { apiClient } from "./api";

export async function hasValidAuthToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return false;
  }

  const { error } = await apiClient.GET("/api/v1/admin/me");

  return !error;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  if (!cookieStore.get("auth_token")?.value) {
    return null;
  }

  const { data, error } = await apiClient.GET("/api/v1/admin/me");
  return error ? null : data;
}