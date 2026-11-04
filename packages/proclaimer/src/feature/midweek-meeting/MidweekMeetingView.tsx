import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonText,
} from "@ionic/react";
import { calendarOutline, musicalNotesOutline, personOutline } from "ionicons/icons";

import { useMidweekMeeting } from "./hooks.ts";
import type { MeetingProgram, MeetingProgramItem, MeetingSectionColor } from "./program.ts";
import { WeekNavigator } from "./WeekNavigator.tsx";

export interface MidweekMeetingViewProps {
  weekId: string;
  congregationId?: string | null;
  onSelectWeek?: (weekId: string) => void;
}

// jw_* colors are defined by the app theme (apps/proclaimer/src/theme/jw-colors.css);
// fall back to medium so the view still renders if a consumer doesn't define them.
const SECTION_COLOR_VARS: Record<MeetingSectionColor, string> = {
  medium: "var(--ion-color-medium)",
  jw_slate: "var(--ion-color-jw_slate, var(--ion-color-medium))",
  jw_brown: "var(--ion-color-jw_brown, var(--ion-color-medium))",
  jw_red: "var(--ion-color-jw_red, var(--ion-color-medium))",
};

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

function SectionHeader({ title, color }: { title: string; color: MeetingSectionColor }) {
  const colorVar = SECTION_COLOR_VARS[color];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 20px 6px",
        color: colorVar,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      <span>{title}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: `color-mix(in srgb, ${colorVar} 35%, transparent)`,
        }}
      />
    </div>
  );
}

function BlockLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "10px 20px 2px",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ion-color-medium)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  );
}

function AssigneeLine({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingTop: 3,
        fontSize: 14,
        color: muted ? "var(--ion-color-medium)" : "var(--ion-text-color)",
      }}
    >
      <IonIcon
        icon={personOutline}
        style={{ fontSize: 13, color: "var(--ion-color-medium)", flexShrink: 0 }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {text}
      </span>
    </div>
  );
}

function MeetingItemRow({
  item,
  color,
  isLast,
}: {
  item: MeetingProgramItem;
  color: MeetingSectionColor;
  isLast: boolean;
}) {
  const colorVar = SECTION_COLOR_VARS[color];

  return (
    <IonItem lines={isLast ? "none" : "inset"} style={{ "--min-height": "46px" }}>
      <div slot="start" style={{ width: 26, display: "flex", justifyContent: "center" }}>
        {item.kind === "song" ? (
          <IonIcon icon={musicalNotesOutline} style={{ fontSize: 18, color: colorVar }} />
        ) : item.partNumber !== undefined ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 22,
              height: 22,
              padding: "0 5px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 700,
              color: colorVar,
              background: `color-mix(in srgb, ${colorVar} 14%, transparent)`,
            }}
          >
            {item.partNumber}
          </span>
        ) : null}
      </div>
      <IonLabel style={{ marginBlock: 6 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            fontSize: 15,
            fontWeight: item.kind === "part" ? 600 : 500,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{item.title}</span>
          {item.minutes !== undefined && (
            <span style={{ fontSize: 12, color: "var(--ion-color-medium)", flexShrink: 0 }}>
              {item.minutes} min
            </span>
          )}
        </div>
        {item.subtitle && (
          <div
            style={{
              paddingTop: 2,
              fontSize: 13,
              color: "var(--ion-color-medium)",
              whiteSpace: "normal",
            }}
          >
            {item.subtitle}
          </div>
        )}
        {item.assignee && <AssigneeLine text={item.assignee} />}
        {item.assistant && (
          <AssigneeLine text={`${item.assistantLabel ?? "Assistant"}: ${item.assistant}`} muted />
        )}
        {item.extraAssignees?.map((extra) => (
          <AssigneeLine key={extra.label} text={`${extra.label}: ${extra.name ?? "—"}`} muted />
        ))}
        {item.kind !== "song" && !item.assignee && <AssigneeLine text="—" muted />}
      </IonLabel>
    </IonItem>
  );
}

function EventBanner({ program }: { program: MeetingProgram }) {
  const event = program.event;
  if (!event) {
    return null;
  }

  if (event.replacesMeeting) {
    return (
      <IonList inset>
        <IonItem lines="none">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: "100%",
              padding: "18px 8px",
              textAlign: "center",
            }}
          >
            <IonIcon
              icon={calendarOutline}
              style={{ fontSize: 26, color: "var(--ion-color-primary)" }}
            />
            <div style={{ fontSize: 17, fontWeight: 700 }}>{event.title}</div>
            {event.name && (
              <div style={{ fontSize: 14, color: "var(--ion-color-medium)" }}>{event.name}</div>
            )}
            <div style={{ fontSize: 13, color: "var(--ion-color-medium)", paddingTop: 4 }}>
              No midweek meeting this week
            </div>
          </div>
        </IonItem>
      </IonList>
    );
  }

  return (
    <IonList inset>
      <IonItem lines="none" color="primary">
        <IonIcon icon={calendarOutline} slot="start" />
        <IonLabel className="ion-text-center">
          {event.title}
          {event.overseerName ? ` — ${event.overseerName}` : ""}
        </IonLabel>
      </IonItem>
    </IonList>
  );
}

function ProgramBody({ program }: { program: MeetingProgram }) {
  if (program.event?.replacesMeeting) {
    return <EventBanner program={program} />;
  }

  return (
    <>
      <EventBanner program={program} />
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

function LoadingBody() {
  return (
    <IonList inset>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <IonItem key={row} lines={row === 5 ? "none" : "inset"}>
          <IonLabel>
            <IonSkeletonText animated style={{ width: "45%", height: 13 }} />
            <p>
              <IonSkeletonText animated style={{ width: "60%", height: 11 }} />
            </p>
          </IonLabel>
        </IonItem>
      ))}
    </IonList>
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
        <LoadingBody />
      ) : (
        <ProgramBody program={program} />
      )}
    </>
  );
}
