import { IonItem, IonLabel, IonList } from "@ionic/react";

import { usePermissions, type PermissionsResult } from "../permission/hooks.ts";

export interface HomeToolsProps {
  congregationId?: string | null;
  /** Injected permissions for testing; defaults to live lookups. */
  permissions?: PermissionsResult;
}

interface HomeTool {
  label: string;
  routerLink: string;
  visible: boolean;
}

export function HomeTools({ congregationId, permissions }: HomeToolsProps) {
  const live = usePermissions(congregationId);
  const resolved = permissions ?? live;

  const tools: HomeTool[] = [
    {
      label: "Secretary",
      routerLink: "/secretary",
      visible: resolved.hasSecretary || resolved.isSuperAdmin,
    },
  ];
  const visibleTools = tools.filter((tool) => tool.visible);

  if (!resolved.isLoaded || visibleTools.length === 0) {
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
