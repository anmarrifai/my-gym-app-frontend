export interface LoggedFood {
  name: string;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isEditing?: boolean;
  tempWeight?: number;
  isSynced?: boolean;
}
