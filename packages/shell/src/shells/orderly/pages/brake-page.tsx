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

export const BrakePage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonBackButton></IonBackButton>
          </IonButtons>
          <IonTitle>Brake</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <Suspense fallback={<Spinner></Spinner>}>
         <div className='full centered'>Brake Page</div>
        </Suspense>
      </IonContent>
    </IonPage>
  );
};

export const BrakePageContent = 
   {
    label: "Brake",
    component: BrakePage,
    //isTab: true,
    //icon: homeOutline,
    path: "/brake",
    redirect: true,
  }