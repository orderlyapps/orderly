import { IonButton, IonList, IonNote, IonText } from "@ionic/react";

import {
  BlockLabel,
  EventBanner,
  MeetingItemRow,
  MeetingProgramLoading,
  SectionHeader,
} from "../meeting/components.tsx";
import { WeekNavigator } from "../meeting/WeekNavigator.tsx";
import { WeekTransition } from "../meeting/WeekTransition.tsx";
import { useMidweekMeeting } from "./hooks.ts";
import type { MeetingProgram } from "./program.ts";
import { midweekMeetingAssignmentIds } from "./schema.ts";

export interface MidweekMeetingViewProps {
  weekId: string;
  congregationId?: string | null;
  onSelectWeek?: (weekId: string) => void;
  /** When the user may edit assignments, rows link to the assignment editor. */
  canEditAssignments?: boolean;
  /** Route prefix for assignment links, e.g. "/schedules/midweek". */
  assignmentBasePath?: string;
}

const ASSIGNMENT_IDS: ReadonlySet<string> = new Set(midweekMeetingAssignmentIds);

function assignmentHref(
  itemId: string,
  readOnly: boolean | undefined,
  weekId: string,
  canEdit: boolean,
  basePath?: string,
): string | undefined {
  if (!canEdit || !basePath || readOnly || !ASSIGNMENT_IDS.has(itemId)) {
    return undefined;
  }
  return `${basePath}/${weekId}/assignment/${itemId}`;
}

function ProgramBody({
  program,
  canEdit,
  assignmentBasePath,
}: {
  program: MeetingProgram;
  canEdit: boolean;
  assignmentBasePath?: string;
}) {
  if (program.event?.replacesMeeting) {
    return <EventBanner event={program.event} unavailableMessage="No midweek meeting this week" />;
  }

  return (
    <>
      {program.event && (
        <EventBanner event={program.event} unavailableMessage="No midweek meeting this week" />
      )}
      {program.sections.map((section) => (
        <div key={section.id}>
          {section.title && <SectionHeader title={section.title} color={section.color} />}
          {section.blocks.map((block, blockIndex) => {
            const items = block.items.filter((item) => item.kind !== "song");
            return (
              <div key={block.label ?? blockIndex}>
                {block.label && <BlockLabel label={block.label} />}
                <IonList inset lines="none" style={{ marginTop: 4 }}>
                  {items.map((item, itemIndex) => (
                    <MeetingItemRow
                      key={item.id}
                      item={{ ...item, subtitle: undefined }}
                      color={section.color}
                      isLast={itemIndex === items.length - 1}
                      href={assignmentHref(
                        item.id,
                        item.readOnly,
                        program.weekId,
                        canEdit,
                        assignmentBasePath,
                      )}
                    />
                  ))}
                </IonList>
              </div>
            );
          })}
        </div>
      ))}
      {!program.hasMeetingData && (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <IonText color="medium">
            <p>No meeting information for this week yet.</p>
          </IonText>
        </div>
      )}
    </>
  );
}

export function MidweekMeetingView({
  weekId,
  congregationId,
  onSelectWeek,
  canEditAssignments = false,
  assignmentBasePath,
}: MidweekMeetingViewProps) {
  const { program, isLoading, error, canRetry, retry } = useMidweekMeeting(weekId, congregationId);

  return (
    <>
      <WeekNavigator
        weekId={weekId}
        label={program.weekLabel}
        relativeLabel={program.relativeLabel}
        onSelectWeek={onSelectWeek}
      />
      <div style={{ height: 24 }} />
      <WeekTransition weekId={weekId}>
        {error ? (
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
        ) : isLoading ? (
          <MeetingProgramLoading />
        ) : (
          <ProgramBody
            program={program}
            canEdit={canEditAssignments}
            assignmentBasePath={assignmentBasePath}
          />
        )}
      </WeekTransition>
    </>
  );
}
