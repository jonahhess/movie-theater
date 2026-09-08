"use server";

import { revalidatePath } from "next/cache";
import { apiClient } from "./api";

type EditableValues = Record<string, string>;
type Resource = "users" | "movies" | "auditoriums" | "screenings" | "tickets" | "screening-seats";

function numberValue(values: EditableValues, key: string) {
  const value = Number(values[key]);
  return Number.isFinite(value) ? value : undefined;
}

function booleanValue(values: EditableValues, key: string) {
  return values[key] === "true";
}

function hasValue(values: EditableValues, key: string) {
  return Object.prototype.hasOwnProperty.call(values, key);
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export async function updateAdminRecord(
  resource: Resource,
  id: number | string,
  values: EditableValues,
) {
  let result;

  if (resource === "users") {
    result = await apiClient.PUT("/api/v1/admin/users/{user_id}", {
      params: { path: { user_id: String(id) } },
      body: {
        ...(hasValue(values, "username") ? { username: values.username } : {}),
        ...(hasValue(values, "email") ? { email: values.email } : {}),
        ...(hasValue(values, "phone") ? { phone: values.phone || null } : {}),
        ...(hasValue(values, "password") ? { password: values.password || undefined } : {}),
      },
    });
  } else if (resource === "movies") {
    result = await apiClient.PATCH("/api/v1/admin/movies/{movie_id}", {
      params: { path: { movie_id: Number(id) } },
      body: {
        ...(hasValue(values, "title") ? { title: values.title } : {}),
        ...(hasValue(values, "description") ? { description: values.description || null } : {}),
        ...(hasValue(values, "duration_minutes")
          ? { duration_minutes: numberValue(values, "duration_minutes") }
          : {}),
        ...(hasValue(values, "rating")
          ? { rating: values.rating as "G" | "PG" | "PG-13" | "R" }
          : {}),
        ...(hasValue(values, "release_date") ? { release_date: values.release_date || null } : {}),
        ...(hasValue(values, "status")
          ? { status: values.status as "draft" | "now_showing" | "archived" }
          : {}),
      },
    });
  } else if (resource === "auditoriums") {
    result = await apiClient.PATCH("/api/v1/admin/auditoriums/{auditorium_id}", {
      params: { path: { auditorium_id: Number(id) } },
      body: {
        ...(hasValue(values, "name") ? { name: values.name } : {}),
        ...(hasValue(values, "is_active")
          ? { is_active: booleanValue(values, "is_active") }
          : {}),
      },
    });
  } else if (resource === "tickets") {
    result = await apiClient.PATCH("/api/v1/admin/tickets/{ticket_id}", {
      params: { path: { ticket_id: Number(id) } },
      body: {
        ...(hasValue(values, "email") ? { email: values.email } : {}),
        ...(hasValue(values, "phone") ? { phone: values.phone || null } : {}),
        ...(hasValue(values, "status")
          ? { status: values.status as "confirmed" | "cancelled" | "redeemed" }
          : {}),
      },
    });
  } else if (resource === "screening-seats") {
    result = await apiClient.PATCH("/api/v1/admin/screening-seats/{screening_seat_id}", {
      params: { path: { screening_seat_id: Number(id) } },
      body: {
        ...(hasValue(values, "is_taken")
          ? { is_taken: booleanValue(values, "is_taken") }
          : {}),
      },
    });
  } else {
    result = await apiClient.PATCH("/api/v1/admin/screenings/{screening_id}", {
      params: { path: { screening_id: Number(id) } },
      body: {
        ...(hasValue(values, "movie_id")
          ? { movie_id: numberValue(values, "movie_id") }
          : {}),
        ...(hasValue(values, "auditorium_id")
          ? { auditorium_id: numberValue(values, "auditorium_id") }
          : {}),
        ...(hasValue(values, "start_time") ? { start_time: values.start_time } : {}),
        ...(hasValue(values, "price") ? { price: values.price } : {}),
        ...(hasValue(values, "status")
          ? { status: values.status as "draft" | "on_sale" | "past" | "cancelled" }
          : {}),
      },
    });
  }

  if (result.error) {
    return { error: errorMessage(result.error, "The changes could not be saved.") };
  }

  revalidatePath(`/${resource}`);
  return {};
}

export async function createAdminRecord(resource: Resource, values: EditableValues) {
  let result;

  if (resource === "users") {
    result = await apiClient.POST("/api/v1/admin/users", {
      body: {
        username: values.username,
        email: values.email,
        phone: values.phone || null,
        password: values.password,
      },
    });
  } else if (resource === "movies") {
    result = await apiClient.POST("/api/v1/admin/movies", {
      body: {
        title: values.title,
        description: values.description || null,
        duration_minutes: numberValue(values, "duration_minutes") ?? 0,
        rating: values.rating as "G" | "PG" | "PG-13" | "R",
        release_date: values.release_date || null,
        status: values.status as "draft" | "now_showing" | "archived",
      },
    });
  } else if (resource === "auditoriums") {
    result = await apiClient.POST("/api/v1/admin/auditoriums", {
      body: {
        name: values.name,
        is_active: booleanValue(values, "is_active"),
      },
    });
  } else {
    result = await apiClient.POST("/api/v1/admin/screenings", {
      body: {
        movie_id: numberValue(values, "movie_id") ?? 0,
        auditorium_id: numberValue(values, "auditorium_id") ?? 0,
        start_time: values.start_time,
        price: values.price,
        status: values.status as "draft" | "on_sale" | "past" | "cancelled",
      },
    });
  }

  if (result.error) {
    return { error: "The new record could not be saved." };
  }

  revalidatePath(`/${resource}`);
  return {};
}

export async function deleteAdminRecord(resource: Resource, id: number | string) {
  let result;

  if (resource === "users") {
    result = await apiClient.DELETE("/api/v1/admin/users/{user_id}", {
      params: { path: { user_id: String(id) } },
    });
  } else if (resource === "movies") {
    result = await apiClient.DELETE("/api/v1/admin/movies/{movie_id}", {
      params: { path: { movie_id: Number(id) } },
    });
  } else if (resource === "auditoriums") {
    result = await apiClient.DELETE("/api/v1/admin/auditoriums/{auditorium_id}", {
      params: { path: { auditorium_id: Number(id) } },
    });
  } else if (resource === "tickets") {
    result = await apiClient.DELETE("/api/v1/admin/tickets/{ticket_id}", {
      params: { path: { ticket_id: Number(id) } },
    });
  } else if (resource === "screening-seats") {
    result = await apiClient.DELETE("/api/v1/admin/screening-seats/{screening_seat_id}", {
      params: { path: { screening_seat_id: Number(id) } },
    });
  } else {
    result = await apiClient.DELETE("/api/v1/admin/screenings/{screening_id}", {
      params: { path: { screening_id: Number(id) } },
    });
  }

  if (result.error) {
    return { error: errorMessage(result.error, "The record could not be deleted.") };
  }

  revalidatePath(`/${resource}`);
  return {};
}

export async function openScreeningSale(id: number | string) {
  const result = await apiClient.POST(
    "/api/v1/admin/screenings/{screening_id}/sale/open",
    { params: { path: { screening_id: Number(id) } } },
  );

  if (result.error) {
    console.error("Failed to open screening sale", { screeningId: id, error: result.error });
    return { error: errorMessage(result.error, "The screening sale could not be opened.") };
  }

  revalidatePath("/screenings");
  return {};
}

export async function closeScreeningSale(id: number | string) {
  const result = await apiClient.POST(
    "/api/v1/admin/screenings/{screening_id}/sale/close",
    { params: { path: { screening_id: Number(id) } } },
  );

  if (result.error) {
    console.error("Failed to close screening sale", { screeningId: id, error: result.error });
    return { error: errorMessage(result.error, "The screening sale could not be closed.") };
  }

  revalidatePath("/screenings");
  return {};
}

export async function createSeat(
  auditoriumId: number,
  values: EditableValues,
) {
  const result = await apiClient.POST(
    "/api/v1/admin/auditoriums/{auditorium_id}/seats",
    {
      params: { path: { auditorium_id: auditoriumId } },
      body: {
        row: values.row,
        number: numberValue(values, "number") ?? 0,
        is_available: booleanValue(values, "is_available"),
        is_accessible: booleanValue(values, "is_accessible"),
        x_pos: numberValue(values, "x_pos") ?? 0,
        y_pos: numberValue(values, "y_pos") ?? 0,
        angle: numberValue(values, "angle") ?? 0,
      },
    },
  );

  if (result.error) {
    return { error: "The new seat could not be saved." };
  }

  revalidatePath(`/auditoriums/${auditoriumId}`);
  return {};
}

export async function updateSeat(
  auditoriumId: number,
  seatId: number | string,
  values: EditableValues,
) {
  const result = await apiClient.PATCH(
    "/api/v1/admin/auditoriums/{auditorium_id}/seats/{seat_id}",
    {
      params: {
        path: { auditorium_id: auditoriumId, seat_id: Number(seatId) },
      },
      body: {
        ...(hasValue(values, "row") ? { row: values.row } : {}),
        ...(hasValue(values, "number")
          ? { number: numberValue(values, "number") }
          : {}),
        ...(hasValue(values, "is_available")
          ? { is_available: booleanValue(values, "is_available") }
          : {}),
        ...(hasValue(values, "is_accessible")
          ? { is_accessible: booleanValue(values, "is_accessible") }
          : {}),
        ...(hasValue(values, "x_pos") ? { x_pos: numberValue(values, "x_pos") } : {}),
        ...(hasValue(values, "y_pos") ? { y_pos: numberValue(values, "y_pos") } : {}),
        ...(hasValue(values, "angle") ? { angle: numberValue(values, "angle") } : {}),
      },
    },
  );

  if (result.error) {
    return { error: "The seat could not be saved." };
  }

  revalidatePath(`/auditoriums/${auditoriumId}`);
  return {};
}

export async function deleteSeat(auditoriumId: number, seatId: number | string) {
  const result = await apiClient.DELETE(
    "/api/v1/admin/auditoriums/{auditorium_id}/seats/{seat_id}",
    {
      params: {
        path: { auditorium_id: auditoriumId, seat_id: Number(seatId) },
      },
    },
  );

  if (result.error) {
    return { error: "The seat could not be deleted." };
  }

  revalidatePath(`/auditoriums/${auditoriumId}`);
  return {};
}

export async function generateSeatLayout(
  auditoriumId: number,
  config: {
    rowCount: number;
    seatsPerRow: number;
    rowSpacing?: number;
    seatSpacing?: number;
    accessibleRows?: string[];
  },
) {
  const result = await apiClient.POST(
    "/api/v1/admin/auditoriums/{auditorium_id}/seats/generate",
    {
      params: { path: { auditorium_id: auditoriumId } },
      body: {
        row_count: config.rowCount,
        seats_per_row: config.seatsPerRow,
        row_spacing: config.rowSpacing ?? 50,
        seat_spacing: config.seatSpacing ?? 45,
        x_offset: 60,
        y_offset: 70,
        accessible_rows: config.accessibleRows ?? ["A"],
      },
    },
  );

  if (result.error) {
    return { error: errorMessage(result.error, "The seat layout could not be generated.") };
  }

  revalidatePath(`/auditoriums/${auditoriumId}`);
  return {};
}