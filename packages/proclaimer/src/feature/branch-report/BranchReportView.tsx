import { useMemo, useState } from "react";

import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSkeletonText,
} from "@ionic/react";

import { monthLabel, previousMonthId, relativeMonthLabel, shiftMonthId } from "../../util/month.ts";
import { SlideTransition } from "../meeting/SlideTransition.tsx";
import { useMeetingAttendances } from "../meeting-attendance/hooks.ts";
import { usePublisherLocalRecords } from "../publisher-local/hooks.ts";
import { usePublishers } from "../publisher/hooks.ts";
import { ActivePublishersModal } from "./ActivePublishersModal.tsx";
import { useReports } from "./hooks.ts";
import { MonthNavigator } from "./MonthNavigator.tsx";
import { PublisherReportsModal } from "./PublisherReportsModal.tsx";
import { ReportValuesModal } from "./ReportValuesModal.tsx";
import {
  ACTIVE_PUBLISHER_WINDOW_MONTHS,
  activePublisherIds,
  monthReportStats,
  resolveActivePublishers,
  weekendAttendanceAverage,
  weekendAttendanceWeeks,
  type ReportCategory,
} from "./stats.ts";
import { WeekendAttendanceModal } from "./WeekendAttendanceModal.tsx";

interface CategoryLabels {
  /** Section header, e.g. "Auxiliary Pioneers". */
  title: string;
  /** Singular reporter label, e.g. "auxiliary pioneer". */
  singular: string;
  /** Plural reporter label, e.g. "auxiliary pioneers". */
  plural: string;
  /** Whether the section shows the "Hours" stat. */
  showHours: boolean;
}

const CATEGORY_LABELS: Record<ReportCategory, CategoryLabels> = {
  publisher: {
    title: "Publishers",
    singular: "publisher",
    plural: "publishers",
    showHours: false,
  },
  auxiliary_pioneer: {
    title: "Auxiliary Pioneers",
    singular: "auxiliary pioneer",
    plural: "auxiliary pioneers",
    showHours: true,
  },
  regular_pioneer: {
    title: "Regular Pioneers",
    singular: "regular pioneer",
    plural: "regular pioneers",
    showHours: true,
  },
};

const REPORT_CATEGORIES = Object.keys(CATEGORY_LABELS) as ReportCategory[];

type StatKind = keyof ReturnType<typeof monthReportStats>;

interface OpenStat {
  kind: StatKind;
  category: ReportCategory;
}

export interface BranchReportViewProps {
  monthId: string;
  congregationId?: string | null;
  onSelectMonth?: (monthId: string) => void;
}

export function BranchReportView({
  monthId,
  congregationId,
  onSelectMonth,
}: BranchReportViewProps) {
  const [activeModalOpen, setActiveModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [openStat, setOpenStat] = useState<OpenStat | null>(null);
  const {
    reports,
    isLoading: reportsLoading,
    error,
    canRetry,
    retry: retryReports,
  } = useReports(congregationId, monthId);
  const { publishers, isLoading: publishersLoading } = usePublishers(congregationId);
  const { records: localRecords, isLoading: localLoading } = usePublisherLocalRecords();
  const {
    attendances,
    isLoading: attendanceLoading,
    error: attendanceError,
    canRetry: canRetryAttendance,
    retry: retryAttendance,
  } = useMeetingAttendances(congregationId, monthId);
  const isLoading = reportsLoading || publishersLoading || localLoading || attendanceLoading;
  const loadError = error ?? attendanceError;
  const retry = async () => {
    await Promise.all([retryReports(), retryAttendance()]);
  };

  const windowStart = shiftMonthId(monthId, -(ACTIVE_PUBLISHER_WINDOW_MONTHS - 1));
  const { publishers: activePublishers, unresolvedCount } = useMemo(
    () => resolveActivePublishers(activePublisherIds(reports, monthId), publishers, localRecords),
    [reports, publishers, localRecords, monthId],
  );
  const weekendAttendance = useMemo(
    () => weekendAttendanceAverage(attendances, monthId),
    [attendances, monthId],
  );
  const attendanceWeeks = useMemo(
    () => weekendAttendanceWeeks(attendances, monthId),
    [attendances, monthId],
  );
  const categoryStats = useMemo(
    () =>
      Object.fromEntries(
        REPORT_CATEGORIES.map((category) => [
          category,
          monthReportStats(reports, publishers, localRecords, monthId, category),
        ]),
      ) as Record<ReportCategory, ReturnType<typeof monthReportStats>>,
    [reports, publishers, localRecords, monthId],
  );

  // Fallbacks keep the modals mounted with stable content while closed.
  const openCategory = openStat?.category ?? "publisher";
  const openLabels = CATEGORY_LABELS[openCategory];
  const openStats = categoryStats[openCategory];

  return (
    <>
      <MonthNavigator
        monthId={monthId}
        label={monthLabel(monthId)}
        relativeLabel={relativeMonthLabel(monthId)}
        latestMonthId={previousMonthId()}
        onSelectMonth={onSelectMonth}
      />
      <div style={{ height: 24 }} />
      <SlideTransition transitionKey={monthId}>
        {loadError ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <IonNote color="danger">{loadError.message}</IonNote>
            {(canRetry || canRetryAttendance) && (
              <div>
                <IonButton fill="clear" size="small" onClick={() => void retry()}>
                  Try Again
                </IonButton>
              </div>
            )}
          </div>
        ) : (
          <>
            <IonList>
              <IonItem button detail onClick={() => setActiveModalOpen(true)}>
                <IonLabel>
                  <h3>All Active Publishers</h3>
                  <p>
                    Active at least once, {monthLabel(windowStart)} – {monthLabel(monthId)}
                  </p>
                </IonLabel>
                <IonNote slot="end" style={{ fontSize: "1rem" }}>
                  {isLoading ? (
                    <IonSkeletonText animated style={{ width: 32, height: 16 }} />
                  ) : (
                    activePublishers.length + unresolvedCount
                  )}
                </IonNote>
              </IonItem>
              <IonItem button detail onClick={() => setAttendanceModalOpen(true)}>
                <IonLabel>
                  <h3>Average Weekend Meeting Attendance</h3>
                  <p>Per week starting in {monthLabel(monthId)}</p>
                </IonLabel>
                <IonNote slot="end" style={{ fontSize: "1rem" }}>
                  {isLoading ? (
                    <IonSkeletonText animated style={{ width: 32, height: 16 }} />
                  ) : weekendAttendance.average == null ? (
                    "—"
                  ) : (
                    Math.round(weekendAttendance.average)
                  )}
                </IonNote>
              </IonItem>
            </IonList>
            {REPORT_CATEGORIES.map((category) => {
              const labels = CATEGORY_LABELS[category];
              const stats = categoryStats[category];
              return (
                <IonList key={category}>
                  <IonListHeader>
                    <IonLabel>{labels.title}</IonLabel>
                  </IonListHeader>
                  <IonItem button detail onClick={() => setOpenStat({ kind: "reports", category })}>
                    <IonLabel>
                      <h3>Number of Reports</h3>
                      <p>
                        {labels.plural[0].toUpperCase() + labels.plural.slice(1)} reporting in{" "}
                        {monthLabel(monthId)}
                      </p>
                    </IonLabel>
                    <IonNote slot="end" style={{ fontSize: "1rem" }}>
                      {isLoading ? (
                        <IonSkeletonText animated style={{ width: 32, height: 16 }} />
                      ) : (
                        stats.reports.entries.length + stats.reports.unresolvedCount
                      )}
                    </IonNote>
                  </IonItem>
                  {labels.showHours && (
                    <IonItem button detail onClick={() => setOpenStat({ kind: "hours", category })}>
                      <IonLabel>
                        <h3>Hours</h3>
                        <p>
                          Reported by {labels.plural} in {monthLabel(monthId)}
                        </p>
                      </IonLabel>
                      <IonNote slot="end" style={{ fontSize: "1rem" }}>
                        {isLoading ? (
                          <IonSkeletonText animated style={{ width: 32, height: 16 }} />
                        ) : (
                          stats.hours.total
                        )}
                      </IonNote>
                    </IonItem>
                  )}
                  <IonItem
                    button
                    detail
                    onClick={() => setOpenStat({ kind: "bibleStudies", category })}
                  >
                    <IonLabel>
                      <h3>Bible Studies</h3>
                      <p>
                        Reported by {labels.plural} in {monthLabel(monthId)}
                      </p>
                    </IonLabel>
                    <IonNote slot="end" style={{ fontSize: "1rem" }}>
                      {isLoading ? (
                        <IonSkeletonText animated style={{ width: 32, height: 16 }} />
                      ) : (
                        stats.bibleStudies.total
                      )}
                    </IonNote>
                  </IonItem>
                </IonList>
              );
            })}
          </>
        )}
      </SlideTransition>
      <ActivePublishersModal
        isOpen={activeModalOpen}
        isLoading={isLoading}
        monthId={monthId}
        publishers={activePublishers}
        unresolvedCount={unresolvedCount}
        onDismiss={() => setActiveModalOpen(false)}
      />
      <WeekendAttendanceModal
        isOpen={attendanceModalOpen}
        isLoading={isLoading}
        monthId={monthId}
        weeks={attendanceWeeks}
        average={weekendAttendance.average}
        onDismiss={() => setAttendanceModalOpen(false)}
      />
      <PublisherReportsModal
        isOpen={openStat?.kind === "reports"}
        isLoading={isLoading}
        monthId={monthId}
        singular={openLabels.singular}
        plural={openLabels.plural}
        entries={openStats.reports.entries}
        unresolvedCount={openStats.reports.unresolvedCount}
        onDismiss={() => setOpenStat(null)}
      />
      <ReportValuesModal
        isOpen={openStat?.kind === "hours"}
        isLoading={isLoading}
        monthId={monthId}
        title="Hours"
        singular={openLabels.singular}
        plural={openLabels.plural}
        unitSingular="hour"
        unitPlural="hours"
        entries={openStats.hours.entries}
        valueOf={(report) => report.hours}
        total={openStats.hours.total}
        unresolvedCount={openStats.hours.unresolvedCount}
        onDismiss={() => setOpenStat(null)}
      />
      <ReportValuesModal
        isOpen={openStat?.kind === "bibleStudies"}
        isLoading={isLoading}
        monthId={monthId}
        title="Bible Studies"
        singular={openLabels.singular}
        plural={openLabels.plural}
        unitSingular="study"
        unitPlural="studies"
        entries={openStats.bibleStudies.entries}
        valueOf={(report) => report.bible_studies}
        total={openStats.bibleStudies.total}
        unresolvedCount={openStats.bibleStudies.unresolvedCount}
        onDismiss={() => setOpenStat(null)}
      />
    </>
  );
}
