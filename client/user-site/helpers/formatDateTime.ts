const formatDateTime = (value: Date | string) =>
    new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
      typeof value === "string" ? new Date(value) : value,
    );

export default formatDateTime;