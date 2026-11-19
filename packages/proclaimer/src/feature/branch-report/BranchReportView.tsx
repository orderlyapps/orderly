import { useMemo, useState } from "react";

import { IonButton, IonItem, IonLabel, IonList, IonNote, IonSkeletonText } from "@ionic/react";

import { monthLabel, previousMonthId, relativeMonthLabel, shiftMonthId } from "../../util/month.ts";
import { SlideTransition } from "../meeting/SlideTransition.tsx";
import { useMeetingAttendances } from "../meeting-attendance/hooks.ts";
import { usePublisherLocalRecords } from "../publisher-local/hooks.ts";
import { usePublishers } from "../publisher/hooks.ts";
import { ActivePublishersModal } from "./ActivePublishersModal.tsx";
import { useReports } from "./hooks.ts";
import { MonthNavigator } from "./MonthNavigator.tsx";
import {
  ACTIVE_PUBLISHER_WINDOW_MONTHS,
  activePublisherIds,
  resolveActivePublishers,
  weekendAttendanceAverage,
  weekendAttendanceWeeks,
} from "./stats.ts";
import { WeekendAttendanceModal } from "./WeekendAttendanceModal.tsx";

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
    </>
  );
}
