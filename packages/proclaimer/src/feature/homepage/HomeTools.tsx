import { IonItem, IonLabel, IonList } from "@ionic/react";

import { usePermissions, type PermissionsResult } from "../permission/hooks.ts";
import { usePublisherStanding, type UsePublisherStandingResult } from "../publisher/hooks.ts";

export interface HomeToolsProps {
  congregationId?: string | null;
  /** Injected permissions for testing; defaults to live lookups. */
  permissions?: PermissionsResult;
  /** Injected publisher standing for testing; defaults to a live lookup. */
  standing?: UsePublisherStandingResult;
}

interface HomeTool {
  label: string;
  routerLink: string;
  visible: boolean;
}

export function HomeTools({ congregationId, permissions, standing }: HomeToolsProps) {
  const livePermissions = usePermissions(congregationId);
  const liveStanding = usePublisherStanding(congregationId);
  const resolved = permissions ?? livePermissions;
  const resolvedStanding = standing ?? liveStanding;

  const tools: HomeTool[] = [
    {
      label: "Secretary",
      routerLink: "/secretary",
      visible: resolved.hasSecretary || resolved.isSuperAdmin,
    },
    {
      label: "Elders",
      routerLink: "/elders",
      visible: resolved.hasElder || resolved.isSuperAdmin,
    },
    {
      label: "Data Import",
      routerLink: "/data-import",
      visible: resolvedStanding.isElderOrMinisterialServant || resolved.isSuperAdmin,
    },
  ];
  const visibleTools = tools.filter((tool) => tool.visible);

  if (!resolved.isLoaded || !resolvedStanding.isLoaded || visibleTools.length === 0) {
    return null;
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <IonItem lines="inset">
        <IonLabel>
          <span style={{ color: "var(--ion-color-primary)", fontSize: "1.125rem" }}>Tools</span>
        </IonLabel>
      </IonItem>
      <IonList>
        {visibleTools.map((tool) => (
          <IonItem key={tool.routerLink} button detail routerLink={tool.routerLink}>
            <IonLabel>{tool.label}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
}
