  import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonModal,
    IonTitle,
    IonToolbar,
  } from '@ionic/react';
  import { useState } from 'react';
  
  export const OsanaModal = () => {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <>
        <IonButton onClick={() => setIsOpen(true)}>
          <strong>Edit</strong>
        </IonButton>
        <IonModal isOpen={isOpen}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Osana</IonTitle>
              <IonButtons slot='end'>
                <IonButton onClick={() => setIsOpen(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
           Osana
          </IonContent>
        </IonModal>
      </>
    );
  };  