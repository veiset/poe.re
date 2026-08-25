const issueTrackerUrl = "https://github.com/veiset/poe.re/issues/new";

export const getBugReportUrl = (title?: string) => {
  const template = import.meta.env.VITE_ISSUE_TEMPLATE || "bug-report.md";
  const params = new URLSearchParams({
    template,
  });

  if (title) {
    const site = template === "bug-report-poe2.md" ? "poe2.re" : "poe.re";
    params.set("title", `[${site}] ${title}`);
  }

  return `${issueTrackerUrl}?${params.toString()}`;
};
