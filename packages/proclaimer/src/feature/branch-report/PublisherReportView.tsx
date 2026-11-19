import { useMemo } from "react";

import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSkeletonText,
} from "@ionic/react";

import { monthLabel } from "../../util/month.ts";
import { usePublisherLocalRecords } from "../publisher-local/hooks.ts";
import { usePublishers } from "../publisher/hooks.ts";
import { usePublisherReports } from "./hooks.ts";
import type { Report } from "./schema.ts";
import {
  publisherConfidentialIds,
  publisherReportMonthIds,
  publisherReportsByMonth,
} from "./stats.ts";

export interface PublisherReportViewProps {
  /** End of the report window — normally the month open on the branch report. */
  monthId: string;
  publisherId?: string | null;
  congregationId?: string | null;
}

/** The September–August service year a month belongs to, e.g. "2025–2026". */
function serviceYearLabel(monthId: string): string {
  const [year, month] = monthId.split("-").map(Number);
  const start = month >= 9 ? year : year - 1;
  return `${start}–${start + 1}`;
}

/**
 * Role/flag descriptors shown under the month label, e.g. "Auxiliary pioneer".
 * Pioneer standing comes from the publisher's current `type` — matching how
 * `monthReportStats` categorizes resolved reports — while `aux_pio`,
 * `spe_pio`, and `reported_elsewhere` stay report-scoped, since those flags
 * describe the individual report rather than the publisher.
 */
function reportFlags(report: Report, publisherType?: string | null): string[] {
  const flags = new Set<string>();
  if (report.aux_pio || publisherType === "continuous_auxiliary") {
    flags.add("Auxiliary pioneer");
  }
  if (report.reg_pio || publisherType === "regular_pioneer") {
    flags.add("Regular pioneer");
  }
  if (report.spe_pio || publisherType === "special_pioneer") {
    flags.add("Special pioneer");
  }
  if (report.reported_elsewhere) {
    flags.add("Reported elsewhere");
  }
  return [...flags];
}

/** End-of-row summary for an active report, e.g. "12 hrs · 3 studies". */
function reportSummary(report: Report): string {
  const parts: string[] = [];
  if (report.hours != null && report.hours > 0) {
    parts.push(`${report.hours} ${report.hours === 1 ? "hr" : "hrs"}`);
  }
  if (report.bible_studies != null && report.bible_studies > 0) {
    parts.push(`${report.bible_studies} ${report.bible_studies === 1 ? "study" : "studies"}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Active";
}

/**
 * A publisher's reports for the `PUBLISHER_REPORT_WINDOW_MONTHS` months ending
 * at `monthId`, newest first and grouped by service year (September–August).
 */
export function PublisherReportView({
  monthId,
  publisherId,
  congregationId,
}: PublisherReportViewProps) {
  const { publishers, isLoading: publishersLoading } = usePublishers(congregationId);
  const { records: localRecords, isLoading: localLoading } = usePublisherLocalRecords();
  const publisher = useMemo(
    () => publishers.find((p) => p.id === publisherId) ?? null,
    [publishers, publisherId],
  );
  const confidentialIds = useMemo(
    () => publisherConfidentialIds(publisher, localRecords),
    [publisher, localRecords],
  );
  const {
    reports,
    isLoading: reportsLoading,
    error,
    canRetry,
    retry,
  } = usePublisherReports(confidentialIds, monthId);
  const isLoading = publishersLoading || localLoading || reportsLoading;

  const byMonth = useMemo(() => publisherReportsByMonth(reports), [reports]);
  const serviceYears = useMemo(() => {
    const groups: { year: string; monthIds: string[] }[] = [];
    for (const id of publisherReportMonthIds(monthId)) {
      const year = serviceYearLabel(id);
      const last = groups[groups.length - 1];
      if (last?.year === year) {
        last.monthIds.push(id);
      } else {
        groups.push({ year, monthIds: [id] });
      }
    }
    return groups;
  }, [monthId]);

  if (error) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote color="danger">{error.message}</IonNote>
        {canRetry && (
          <div>
            <IonButton fill="clear" size="small" onClick={() => void retry()}>
              Try Again
            </IonButton>
          </div>
        )}
      </div>
    );
  }

  if (!isLoading && publisher == null) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <IonNote>This publisher isn't on this device.</IonNote>
      </div>
    );
  }

  if (isLoading) {
    return (
      <IonList>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <IonItem key={i}>
            <IonLabel>
              <IonSkeletonText style={{ width: "60%" }} />
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    );
  }

  return (
    <>
      {serviceYears.map((group) => (
        <IonList key={group.year}>
          <IonListHeader>
            <IonLabel>
              <IonNote>{group.year} Service Year</IonNote>
            </IonLabel>
          </IonListHeader>
          {group.monthIds.map((id) => {
            const report = byMonth.get(id);
            const flags = report ? reportFlags(report, publisher?.type) : [];
            return (
              <IonItem key={id}>
                <IonLabel>
                  <h3>{monthLabel(id)}</h3>
                  {flags.length > 0 && <p>{flags.join(" · ")}</p>}
                </IonLabel>
                <IonNote slot="end">
                  {report == null
                    ? "No report"
                    : !report.active
                      ? "Not active"
                      : reportSummary(report)}
                </IonNote>
              </IonItem>
            );
          })}
        </IonList>
      ))}
    </>
  );
}
