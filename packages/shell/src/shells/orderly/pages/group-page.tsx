import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { settingsOutline, homeOutline } from "ionicons/icons";
import { Spinner } from '../../../shell-components/ionic/spinner';
import { Suspense } from 'react';

export const GroupPage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonBackButton></IonBackButton>
          </IonButtons>
          <IonTitle>Group</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <Suspense fallback={<Spinner></Spinner>}>
         <div className='full centered'>Group Page</div>
        </Suspense>
      </IonContent>
    </IonPage>
  );
};

export const GroupPageContent = 
   {
    label: "Group",
    component: GroupPage,
    //isTab: true,
    //icon: homeOutline,
    path: "/group",
    redirect: true,
  }