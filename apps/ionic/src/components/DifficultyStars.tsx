import { IonIcon } from "@ionic/react";
import { star, starOutline } from "ionicons/icons";

import "./DifficultyStars.css";

interface DifficultyStarsProps {
  value: number;
  max?: number;
}

const DifficultyStars = ({ value, max = 5 }: DifficultyStarsProps) => {
  return (
    <span className="difficulty-stars" aria-label={`Difficulty ${value} of ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <IonIcon key={index} aria-hidden="true" icon={index < value ? star : starOutline} />
      ))}
    </span>
  );
};

export default DifficultyStars;
