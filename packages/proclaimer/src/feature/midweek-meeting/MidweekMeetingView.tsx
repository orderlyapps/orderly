import { IonButton, IonList, IonNote, IonText } from "@ionic/react";

import {
  BlockLabel,
  EventBanner,
  MeetingItemRow,
  MeetingProgramLoading,
  SectionHeader,
} from "../meeting/components.tsx";
import { WeekNavigator } from "../meeting/WeekNavigator.tsx";
import { useMidweekMeeting } from "./hooks.ts";
import type { MeetingProgram } from "./program.ts";

export interface MidweekMeetingViewProps {
  weekId: string;
  congregationId?: string | null;
  onSelectWeek?: (weekId: string) => void;
}

const TITLE_CASE_SMALL_WORDS = new Set(["of", "the", "and", "to", "in", "a", "an"]);

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && TITLE_CASE_SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function ProgramBody({ program }: { program: MeetingProgram }) {
  if (program.event?.replacesMeeting) {
    return <EventBanner event={program.event} unavailableMessage="No midweek meeting this week" />;
  }

  return (
    <>
      {program.event && (
        <EventBanner event={program.event} unavailableMessage="No midweek meeting this week" />
      )}
      {program.bibleReading && (
        <div
          style={{
            padding: "2px 20px 0",
            fontSize: 13,
            color: "var(--ion-color-medium)",
            textAlign: "center",
          }}
        >
          Weekly Bible Reading · {titleCase(program.bibleReading)}
        </div>
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

export function MidweekMeetingView({
  weekId,
  congregationId,
  onSelectWeek,
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
    </>
  );
}
