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
import { useWeekendMeeting } from "./hooks.ts";
import type { WeekendMeetingProgram } from "./program.ts";

export interface WeekendMeetingViewProps {
  weekId: string;
  congregationId?: string | null;
  onSelectWeek?: (weekId: string) => void;
}

const NO_MEETING_MESSAGE = "No weekend meeting this week";

function ProgramBody({ program }: { program: WeekendMeetingProgram }) {
  if (program.event?.replacesMeeting) {
    return <EventBanner event={program.event} unavailableMessage={NO_MEETING_MESSAGE} />;
  }

  return (
    <>
      {program.event && (
        <EventBanner event={program.event} unavailableMessage={NO_MEETING_MESSAGE} />
      )}
      {program.sections.map((section) => (
        <div key={section.id}>
          {section.title && <SectionHeader title={section.title} color={section.color} />}
          {section.blocks.map((block, blockIndex) => (
            <div key={block.label ?? blockIndex}>
              {block.label && <BlockLabel label={block.label} />}
              <IonList inset lines="none" style={{ marginTop: 4 }}>
                {block.items.map((item, itemIndex) => (
                  <MeetingItemRow
                    key={item.id}
                    item={item}
                    color={section.color}
                    isLast={itemIndex === block.items.length - 1}
                  />
                ))}
              </IonList>
            </div>
          ))}
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

export function WeekendMeetingView({
  weekId,
  congregationId,
  onSelectWeek,
}: WeekendMeetingViewProps) {
  const { program, isLoading, error, canRetry, retry } = useWeekendMeeting(weekId, congregationId);

  return (
    <>
      <WeekNavigator
        weekId={weekId}
        label={program.weekLabel}
        relativeLabel={program.relativeLabel}
        onSelectWeek={onSelectWeek}
      />
      <div style={{ height: 48 }} />
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
          <ProgramBody program={program} />
        )}
      </WeekTransition>
    </>
  );
}
